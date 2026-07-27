"""추출 회귀 평가 (MIRI-8 lite) — 프롬프트/모델을 바꿀 때마다 돌려서 퇴행을 잡는다.

사용: agent-worker에서  .venv/bin/python eval/run_eval.py
채점: 사건 개수가 아니라 매칭 재료(노선/정류장/기간)의 '집합'을 정답과 비교.
      집합이 같으면 사건을 몇 개로 쪼갰든 통과 — 다운스트림(analyst)이 보는 것과 같은 기준.
종료코드: 실패 차원이 하나라도 있으면 1 (CI에서 바로 쓸 수 있게).
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))  # agent-worker를 import 경로에

from graph import extract_node
from analyst import _norm

CASES = json.loads((pathlib.Path(__file__).parent / "cases.json").read_text(encoding="utf-8"))["cases"]
DIMS = ["lines", "stops", "periods"]


def got_sets(extraction):
    """추출 결과 → 채점용 집합 3종 (analyst와 같은 정규화)."""
    lines, stops, periods = set(), set(), set()
    for ev in (extraction or {}).get("events", []):
        lines |= {_norm(v) for v in ev.get("affected_lines") or []}
        stops |= {_norm(v) for v in ev.get("affected_stops") or []}
        if ev.get("period"):
            periods.add(" ".join(ev["period"].split()))  # 공백만 정리 (형식 자체가 채점 대상)
    return {"lines": lines, "stops": stops, "periods": periods}


def expected_sets(expected):
    return {
        "lines": {_norm(v) for v in expected.get("lines", [])},
        "stops": {_norm(v) for v in expected.get("stops", [])},
        "periods": {" ".join(p.split()) for p in expected.get("periods", [])},
    }


def main():
    failures = 0
    for case in CASES:
        result = extract_node({"raw_text": case["raw_text"], "title": case["title"]})
        if result.get("error"):
            print(f"❌ {case['id']}: 추출 실패 — {result['error']}")
            failures += 1
            continue
        got = got_sets(result["extraction"])
        want = expected_sets(case["expected"])
        dims = case.get("score_dims", DIMS)
        marks = []
        for dim in dims:
            if got[dim] == want[dim]:
                marks.append(f"{dim} ✓")
            else:
                failures += 1
                missing = want[dim] - got[dim]
                extra = got[dim] - want[dim]
                detail = []
                if missing:
                    detail.append(f"누락 {sorted(missing)}")
                if extra:
                    detail.append(f"과잉 {sorted(extra)}")
                marks.append(f"{dim} ✗ ({' / '.join(detail)})")
        status = "✅" if all("✗" not in m for m in marks) else "❌"
        print(f"{status} {case['id']}: " + " · ".join(marks))

    total_dims = sum(len(c.get("score_dims", DIMS)) for c in CASES)
    print(f"\n결과: {total_dims - failures}/{total_dims} 차원 통과" + ("" if failures == 0 else f" — 실패 {failures}"))
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
