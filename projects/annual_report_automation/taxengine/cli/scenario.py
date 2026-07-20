"""절세 시나리오 CLI — 감가상각 방법·내용연수의 적법 조합별 세액을 비교한다.

    python -m taxengine.cli.scenario [--dir <폴더>] [--top N]

⚠️ 모든 조합은 과세이연형이다(세금을 앞당기거나 미룰 뿐, 총 부담은 안 줄어든다).
   engine/scenario.py 모듈 docstring 참고. "추천"이 아니라 비교표 + 근거 조문만 보여준다.
"""

import sys
from pathlib import Path

from taxengine.loader import 자산행
from taxengine.pipeline import 실행
from taxengine.engine.scenario import 비교


def won(n) -> str:
    return f"{int(n):,}"


def run(dir_str: str, top: int = 5) -> int:
    d = Path(dir_str)
    out = 실행(d)
    회사 = out["회사"]

    자산목록 = [자산행(a) for a in out["자산대장"]]
    기타가산 = out["가산조정"] - out["감가부인"]
    기타차감 = out["차감조정"] - out["감가추인"]

    입력공통 = {
        "당기순이익": out["v"]["당기순이익"],
        "기부금한도초과": 회사.get("기부금한도초과", 0), "이월결손금": 회사.get("이월결손금", 0),
        "공제감면세액": 회사.get("공제감면세액", 0), "가산세": 회사.get("가산세", 0),
        "기납부세액": 회사.get("기납부세액", 0),
        "중소기업": 회사.get("중소기업") is True, "사업연도개시일": 회사["사업연도개시일"],
    }

    try:
        결과 = 비교(자산목록, 회사, 기타가산, 기타차감, 입력공통)
    except ValueError as e:
        print(f"\n  ⚠️ {e}\n")
        return 1

    print(f"\n  절세 시나리오 — 감가상각 방법·내용연수 조합 비교")
    print(f"  대상: {d} · 적법 조합 {len(결과['조합들'])}개")
    print(f"\n  ⚠️ {결과['과세이연_경고']}\n")

    실제 = out["r"]["차감납부세액"]
    print(f"  현재(실제 신고) 차감납부세액: {won(실제)}\n")

    print(f"  [상위 {min(top, len(결과['조합들']))}개 — 차감납부세액 낮은 순]")
    for i, c in enumerate(결과["조합들"][:top], 1):
        선택문구 = " · ".join(f"{s['자산']}:{s['방법']}{s['내용연수']}년" for s in c["선택"])
        차이 = c["차감납부세액"] - 실제
        차이문구 = f"(실제 대비 {'−' if 차이 < 0 else '+'}{won(abs(차이))})" if 차이 else "(= 실제와 동일)"
        print(f"    {i}. 차감납부세액 {won(c['차감납부세액']):>14}  {차이문구}   {선택문구}")

    print(f"\n  최다부담 조합: {won(결과['최다부담']['차감납부세액'])}")
    print("  ※ 최종 선택은 세무사와 상의하세요 — 이 표는 적법 조합의 세액 차이만 보여줍니다.\n")
    return 0


def main():
    argv = sys.argv[1:]

    def opt(flag):
        return argv[argv.index(flag) + 1] if flag in argv else None

    sys.exit(run(opt("--dir") or "data/example/fy2025", int(opt("--top") or 5)))


if __name__ == "__main__":
    main()
