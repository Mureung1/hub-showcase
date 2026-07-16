"""재현 CLI — 종이책 CSV를 읽어 세무조정을 재현하고 정답지와 대조한다.

    python -m taxengine.cli.reproduce [--dir <폴더>]
    기본 폴더: data/templates (형식 예시). 실제 사용: data/private/fy2025 로 --dir 지정.

흐름: 입력 로드 → 무결성 검증 → 감가상각 시부인 → 조정 집계 → 별지3 계산 → 정답지 대조
"""

import sys
from decimal import Decimal
from pathlib import Path

from taxengine.loader import parse_file, parse_key_value, 합계
from taxengine.validate import 검증
from taxengine.engine.depreciation import 시부인
from taxengine.engine.tax import 계산
from taxengine.money import 원


def won(n) -> str:
    if n is None:
        return "—"
    return f"{int(n):,}"


def 로드(d: Path) -> dict:
    def opt(name):
        return parse_file(d / name) if (d / name).exists() else None
    return {
        "회사": parse_key_value(d / "company.csv"),
        "손익계산서": parse_file(d / "income_statement.csv"),
        "재무상태표": opt("balance_sheet.csv"),
        "자산대장": parse_file(d / "assets.csv"),
        "조정": parse_file(d / "adjustments.csv"),
        "정답": parse_key_value(d / "answer.csv") if (d / "answer.csv").exists() else None,
    }


def run(dir_str: str) -> int:
    d = Path(dir_str)
    data = 로드(d)
    회사, 손익계산서, 재무상태표 = data["회사"], data["손익계산서"], data["재무상태표"]
    자산대장, 조정, 정답 = data["자산대장"], data["조정"], data["정답"]

    print(f"\n  재현 대상: {d}")
    print(f"  법인: 사업연도 {회사['사업연도개시일']} ~ {회사['사업연도종료일']} · "
          f"{'중소기업' if 회사.get('중소기업') else '일반법인'}\n")

    # 1. 무결성 검증
    v = 검증(재무상태표=재무상태표, 손익계산서=손익계산서, 자산대장=자산대장)
    print("  [1] 입력 무결성 검증")
    for c in v["checks"]:
        print(f"      {'✓' if c['ok'] else '✗'} {c['name']} — {c['detail']}")
    if not v["ok"]:
        print("\n  ⚠️ 입력 오류가 있습니다. 종이 원본과 대조해 수정 후 다시 실행하세요.\n")
        return 1

    당기순이익 = v["당기순이익"]

    # 2. 감가상각 시부인 (자산별)
    print("\n  [2] 감가상각 시부인")
    자산정규화 = [{
        "명": a["명"], "구분": a["구분"], "취득일": a["취득일"],
        "취득가": a["취득가"], "기초누계": a["기초누계"], "회사계상액": a["회사계상액"],
        "방법": a["방법"], "내용연수": int(str(a["내용연수"]).replace(",", "")),
        "전기이월부인액": a["전기이월부인액"],
        "업무용승용차": str(a.get("업무용승용차")).lower() == "true",
    } for a in 자산대장]
    감가부인 = Decimal(0)
    감가추인 = Decimal(0)
    for a in 자산정규화:
        s = 시부인(a, 회사)
        감가부인 += s["부인액"]
        감가추인 += s["추인액"]
        flag = (f"부인 +{won(s['부인액'])}" if s["부인액"]
                else f"추인 −{won(s['추인액'])}" if s["추인액"] else "일치")
        print(f"      · {s['자산']:<6} {s['방법']}{s['내용연수']}년  "
              f"계상 {won(s['회사계상액'])} / 범위 {won(s['상각범위액'])}  → {flag}")

    # 3. 조정 집계 (소득금액조정합계표)
    가산조정 = 합계([r for r in 조정 if r["구분"] in ("익금산입", "손금불산입")], "금액") + 감가부인
    차감조정 = 합계([r for r in 조정 if r["구분"] in ("손금산입", "익금불산입")], "금액") + 감가추인
    print("\n  [3] 소득금액조정합계표")
    print(f"      가산(익금산입·손금불산입): {won(가산조정)}  "
          f"(명세서 {won(가산조정 - 감가부인)} + 감가부인 {won(감가부인)})")
    print(f"      차감(손금산입·익금불산입): {won(차감조정)}")

    # 4. 별지3 세액 계산
    r = 계산({
        "당기순이익": 당기순이익, "가산조정": 가산조정, "차감조정": 차감조정,
        "기부금한도초과": 회사.get("기부금한도초과", 0), "이월결손금": 회사.get("이월결손금", 0),
        "공제감면세액": 회사.get("공제감면세액", 0), "가산세": 회사.get("가산세", 0),
        "기납부세액": 회사.get("기납부세액", 0),
        "중소기업": 회사.get("중소기업") is True, "사업연도개시일": 회사["사업연도개시일"],
    })
    print("\n  [4] 별지3 세액조정계산서")
    for s in r["단계"]:
        val = s.get("주석", "") if s["금액"] is None else won(s["금액"])
        star = "  ★" if s.get("최종") else ""
        print(f"      {s['부호'] or ' '} {s['라벨']:<24} {str(val):>14}{star}")
    print(f"      + 법인지방소득세 (위택스 별도)      {won(r['지방소득세']['산출세액']):>14}")
    print(f"      = 총 납부세액                       {won(r['총납부세액']):>14}")

    # 5. 정답지 대조
    if 정답:
        print("\n  [5] 종이책 정답지 대조")
        rows = [
            ("각사업연도소득", r["각사업연도소득"], 정답.get("각사업연도소득")),
            ("과세표준", r["과세표준"], 정답.get("과세표준")),
            ("산출세액", r["산출세액"], 정답.get("산출세액")),
            ("차감납부세액", r["차감납부세액"], 정답.get("차감납부세액")),
            ("지방소득세", r["지방소득세"]["산출세액"], 정답.get("지방소득세")),
        ]
        rows = [row for row in rows if row[2] is not None]
        일치 = 0
        for name, 엔진, 실제 in rows:
            ok = 원(엔진) == 원(실제)
            일치 += ok
            diff = "" if ok else f"  차이 {won(원(엔진) - 원(실제))}"
            print(f"      {'✓' if ok else '✗'} {name:<14} "
                  f"엔진 {won(엔진):>14} / 실제 {won(실제):>14}{diff}")
        성공 = 일치 == len(rows)
        head = "✅ 재현 성공" if 성공 else f"⚠️ {len(rows) - 일치}개 불일치"
        print(f"\n  {head} — {일치}/{len(rows)} 항목 일치")
        if not 성공:
            print("     불일치는 셋 중 하나입니다: ⓐ 입력 오타 ⓑ 엔진 로직 오류 "
                  "ⓒ 세무사 판단 개입(재현 불가가 정상)")
            return 1
    else:
        print("\n  (answer.csv 없음 — 정답지 대조 생략)")
    print("")
    return 0


def main():
    argv = sys.argv[1:]
    dir_str = "data/templates"
    if "--dir" in argv:
        dir_str = argv[argv.index("--dir") + 1]
    sys.exit(run(dir_str))


if __name__ == "__main__":
    main()
