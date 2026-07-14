# /// script
# requires-python = ">=3.13"
# dependencies = ["httpx"]
# ///
"""API smoke test.

백엔드를 바꾼 뒤 최소 확인. 상태 코드, 응답 개수, 전체 정렬, 필드명을 실제로 판정한다.
실패하면 기대값과 실제값을 함께 출력한다.

실행 (백엔드가 떠 있어야 한다):
    uv run scripts/smoke_api.py
    uv run scripts/smoke_api.py --base http://localhost:8000

검증 기준은 docs/quality/api-smoke.md에 있다.
"""

import argparse
import sys
from typing import Any

import httpx

SELECTABLE_LAUNCH_STATUSES = {"active", "curated_only"}
EXPECTED_INTEREST_FIELDS = {
    "id",
    "name",
    "displayOrder",
    "launchStatus",
    "riskLevel",
    "emptyStateMessage",
}

results: list[tuple[bool, str]] = []


def check(passed: bool, label: str, expected: Any = None, actual: Any = None) -> bool:
    mark = "PASS" if passed else "FAIL"
    line = f"[{mark}] {label}"
    if not passed and expected is not None:
        line += f"\n       기대: {expected}\n       실제: {actual}"
    print(line)
    results.append((passed, label))
    return passed


def check_health(base: str) -> None:
    print("=== GET /api/health ===")
    response = httpx.get(f"{base}/api/health", timeout=10)

    check(
        response.status_code == 200,
        "상태 코드",
        expected=200,
        actual=response.status_code,
    )
    if response.status_code != 200:
        return

    body = response.json()
    check(
        body == {"status": "ok"},
        "응답 본문",
        expected={"status": "ok"},
        actual=body,
    )


def check_interests(base: str) -> None:
    print("\n=== GET /api/interests ===")
    response = httpx.get(f"{base}/api/interests", timeout=10)

    check(
        response.status_code == 200,
        "상태 코드",
        expected=200,
        actual=response.status_code,
    )
    if response.status_code != 200:
        return

    interests = response.json()

    if not check(
        isinstance(interests, list) and len(interests) > 0,
        "배열이며 비어 있지 않음",
        expected="1건 이상인 배열",
        actual=f"{type(interests).__name__}, {len(interests) if isinstance(interests, list) else '-'}건",
    ):
        return

    # 필드명 — snake_case가 새어 나오면 안 된다
    actual_fields = set(interests[0].keys())
    check(
        actual_fields == EXPECTED_INTEREST_FIELDS,
        "필드명이 camelCase",
        expected=sorted(EXPECTED_INTEREST_FIELDS),
        actual=sorted(actual_fields),
    )

    # 정렬 — 앞부분만이 아니라 전체를 판정한다
    orders = [item["displayOrder"] for item in interests]
    if orders != sorted(orders):
        first_break = next(
            i for i in range(1, len(orders)) if orders[i] < orders[i - 1]
        )
        check(
            False,
            "displayOrder 오름차순 정렬",
            expected="오름차순",
            actual=f"index {first_break - 1}={orders[first_break - 1]} 다음이 "
            f"index {first_break}={orders[first_break]}",
        )
    else:
        check(True, "displayOrder 오름차순 정렬")

    # 노출 필터 — hidden, preparing이 응답에 실려 나가면 안 된다
    leaked = sorted(
        {
            item["launchStatus"]
            for item in interests
            if item["launchStatus"] not in SELECTABLE_LAUNCH_STATUSES
        }
    )
    check(
        not leaked,
        "선택 불가능한 관심사가 응답에 없음",
        expected=f"{sorted(SELECTABLE_LAUNCH_STATUSES)}만 포함",
        actual=f"{leaked}가 포함됨",
    )

    # curated_only만 emptyStateMessage를 가진다
    wrong = [
        item["name"]
        for item in interests
        if (item["emptyStateMessage"] is not None)
        != (item["launchStatus"] == "curated_only")
    ]
    check(
        not wrong,
        "emptyStateMessage는 curated_only에만 존재",
        expected="없음",
        actual=wrong,
    )

    print(f"       ({len(interests)}건 조회됨)")


def check_openapi(base: str) -> None:
    print("\n=== 회귀 — 라우트 등록 ===")

    docs = httpx.get(f"{base}/docs", timeout=10)
    check(docs.status_code == 200, "/docs 응답", expected=200, actual=docs.status_code)

    response = httpx.get(f"{base}/openapi.json", timeout=10)
    if not check(
        response.status_code == 200,
        "/openapi.json 응답",
        expected=200,
        actual=response.status_code,
    ):
        return

    paths = set(response.json()["paths"])
    required = {"/api/health", "/api/interests"}
    missing = sorted(required - paths)
    check(
        not missing,
        "필수 라우트가 등록됨",
        expected=sorted(required),
        actual=f"누락: {missing}",
    )
    print(f"       (등록된 라우트: {sorted(paths)})")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8000")
    args = parser.parse_args()

    try:
        check_health(args.base)
        check_interests(args.base)
        check_openapi(args.base)
    except httpx.ConnectError:
        print(f"백엔드에 연결할 수 없다: {args.base}")
        print("cd backend && uv run fastapi dev app/main.py")
        return 1

    failed = [label for ok, label in results if not ok]
    print("\n" + "=" * 40)
    if failed:
        print(f"실패 {len(failed)}건:")
        for label in failed:
            print(f"  - {label}")
        return 1
    print(f"전체 {len(results)}건 통과")
    return 0


if __name__ == "__main__":
    sys.exit(main())
