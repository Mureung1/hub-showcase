# /// script
# requires-python = ">=3.13"
# dependencies = ["supabase>=2.11.0", "httpx", "python-dotenv"]
# ///
"""Supabase DB/Auth 검증 스크립트 (이슈 #1).

프로젝트 의존성에 영향을 주지 않는 독립 실행 스크립트다.

실행:
    uv run scripts/verify_supabase.py

필요한 환경변수 (backend/.env, frontend/.env에서 읽는다):
    SUPABASE_URL, SUPABASE_SECRET_KEY
    VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

검증 항목은 docs/quality/supabase-db-auth.md에 있다.
"""

import sys
from pathlib import Path

import httpx
from dotenv import dotenv_values
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent

results: list[tuple[bool, str]] = []


def check(passed: bool, label: str, detail: str = "") -> bool:
    mark = "PASS" if passed else "FAIL"
    line = f"[{mark}] {label}"
    if detail:
        line += f" — {detail}"
    print(line)
    results.append((passed, label))
    return passed


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for path in (ROOT / "backend" / ".env", ROOT / "frontend" / ".env"):
        if path.exists():
            env.update({k: v for k, v in dotenv_values(path).items() if v})
    return env


def main() -> int:
    env = load_env()

    url = env.get("SUPABASE_URL")
    secret_key = env.get("SUPABASE_SECRET_KEY")
    publishable_key = env.get("VITE_SUPABASE_PUBLISHABLE_KEY")

    print("=== 1. 환경변수와 키 체계 ===")
    if not check(bool(url), "SUPABASE_URL 존재"):
        return 1
    if not check(bool(secret_key), "SUPABASE_SECRET_KEY 존재"):
        return 1
    if not check(bool(publishable_key), "VITE_SUPABASE_PUBLISHABLE_KEY 존재"):
        return 1

    check(
        publishable_key.startswith("sb_publishable_"),
        "publishable 키가 신규 형식",
        f"{publishable_key[:18]}...",
    )
    check(
        secret_key.startswith("sb_secret_"),
        "secret 키가 신규 형식 (legacy service_role JWT 아님)",
        f"{secret_key[:13]}...",
    )

    print("\n=== 2. Anonymous Auth ===")
    client_a = create_client(url, publishable_key)
    try:
        session_a = client_a.auth.sign_in_anonymously()
    except Exception as exc:  # noqa: BLE001
        check(False, "익명 세션 생성", f"{exc}")
        print("\n→ 대시보드 Authentication > Sign In / Providers에서 "
              "Anonymous sign-ins를 활성화해야 한다.")
        return 1

    user_a = session_a.user
    if not check(user_a is not None, "익명 세션 생성"):
        return 1

    check(user_a.is_anonymous is True, "생성된 유저가 익명 유저", f"id={user_a.id}")

    print("\n=== 3. 공개 테이블 읽기 (RLS 공개 읽기 정책) ===")
    interests = client_a.table("interests").select("id, name").execute()
    check(len(interests.data) > 0, "interests 읽기 가능", f"{len(interests.data)}건")

    print("\n=== 4. RLS 사용자 경계 (user_interests) ===")
    interest_id = interests.data[0]["id"]

    inserted = (
        client_a.table("user_interests")
        .insert({"user_id": user_a.id, "interest_id": interest_id})
        .execute()
    )
    check(len(inserted.data) == 1, "본인 user_id로 INSERT 성공")

    own = client_a.table("user_interests").select("*").execute()
    check(len(own.data) == 1, "본인 데이터는 조회됨", f"{len(own.data)}건")

    client_b = create_client(url, publishable_key)
    session_b = client_b.auth.sign_in_anonymously()
    user_b = session_b.user
    other = client_b.table("user_interests").select("*").execute()
    check(
        len(other.data) == 0,
        "다른 유저의 데이터는 조회되지 않음 (RLS 차단)",
        f"{len(other.data)}건",
    )

    try:
        client_b.table("user_interests").insert(
            {"user_id": user_a.id, "interest_id": interest_id}
        ).execute()
        check(False, "다른 유저 id로 INSERT 차단", "차단되지 않았다")
    except Exception:  # noqa: BLE001
        check(True, "다른 유저 id로 INSERT 차단 (WITH CHECK)")

    print("\n=== 5. secret 키 브라우저 차단 ===")
    browser_response = httpx.get(
        f"{url}/rest/v1/interests",
        params={"select": "id", "limit": 1},
        headers={
            "apikey": secret_key,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
        },
        timeout=10,
    )
    check(
        browser_response.status_code == 401,
        "브라우저 User-Agent로 secret 키 사용 시 401",
        f"status={browser_response.status_code}",
    )

    print("\n=== 6. 정리 ===")
    admin = create_client(url, secret_key)

    test_user_ids = [user_a.id, user_b.id]
    admin.table("user_interests").delete().in_("user_id", test_user_ids).execute()
    for user_id in test_user_ids:
        admin.auth.admin.delete_user(user_id)

    remaining_rows = (
        admin.table("user_interests").select("*").in_("user_id", test_user_ids).execute()
    )
    check(len(remaining_rows.data) == 0, "테스트 데이터 삭제 완료")

    remaining_users = admin.auth.admin.list_users()
    leftover = [u for u in remaining_users if u.id in test_user_ids]
    check(len(leftover) == 0, "테스트 익명 유저 삭제 완료")

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
