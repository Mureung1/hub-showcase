"""재현 CLI — 종이책 CSV를 읽어 세무조정을 재현하고 정답지와 대조한다.

    python -m taxengine.cli.reproduce [--dir <폴더>] [--prev <전기폴더>]
    기본 폴더: data/example/fy2025 (작동 예시). 실제 사용: data/private/fy2025 로 --dir 지정.
    빈 입력 양식은 data/templates/ 에 있다 — 복사해서 채운다.
    --prev 를 주면 전기(작년) 폴더와의 연도 간 자동이월 연속성을 먼저 검증한다.

흐름: (--prev면 연속성검증 →) 무결성 검증 → 감가상각 시부인 → 조정 집계 → 별지3 → 정답지 대조
"""

import sys
from decimal import Decimal
from pathlib import Path

from taxengine.loader import parse_file
from taxengine.pipeline import 실행
from taxengine.carryover import 연속성검증
from taxengine.money import 원


def won(n) -> str:
    return "—" if n is None else f"{int(n):,}"


def run(dir_str: str, prev_str: str | None = None) -> int:
    d = Path(dir_str)
    out = 실행(d)
    회사, v, r = out["회사"], out["v"], out["r"]

    print(f"\n  재현 대상: {d}")
    print(f"  법인: 사업연도 {회사['사업연도개시일']} ~ {회사['사업연도종료일']} · "
          f"{'중소기업' if 회사.get('중소기업') else '일반법인'}")

    # 0. 연도 간 자동이월 연속성 검증 (--prev 있을 때만)
    if prev_str:
        전기 = 실행(Path(prev_str))
        c = 연속성검증(전기, out["자산대장"], 회사)
        print(f"\n  [0] 연도 간 이월 연속성 ({Path(prev_str).name} → {d.name})")
        for chk in c["checks"]:
            print(f"      {'✓' if chk['ok'] else '✗'} {chk['name']} — {chk['detail']}")
        if not c["ok"]:
            print("\n  ⚠️ 전기→당기 이월이 어긋납니다. 당기 기초값(기초누계·전기이월부인액·이월결손금)을 "
                  "전기 신고서와 대조하세요.\n")
            return 1

    # 1. 무결성 검증
    print("\n  [1] 입력 무결성 검증")
    for chk in v["checks"]:
        print(f"      {'✓' if chk['ok'] else '✗'} {chk['name']} — {chk['detail']}")
    if not v["ok"]:
        print("\n  ⚠️ 입력 오류가 있습니다. 종이 원본과 대조해 수정 후 다시 실행하세요.\n")
        return 1

    # 2. 감가상각 시부인
    print("\n  [2] 감가상각 시부인")
    for s in out["시부인들"]:
        flag = (f"부인 +{won(s['부인액'])}" if s["부인액"]
                else f"추인 −{won(s['추인액'])}" if s["추인액"] else "일치")
        print(f"      · {s['자산']:<6} {s['방법']}{s['내용연수']}년  "
              f"계상 {won(s['회사계상액'])} / 범위 {won(s['상각범위액'])}  → {flag}")

    # 3. 조정 집계
    print("\n  [3] 소득금액조정합계표")
    추진비 = out.get("추진비")
    추진비손불 = 추진비["손금불산입합계"] if 추진비 else Decimal(0)
    if 추진비:
        한도초과문구 = f", 한도초과 {won(추진비['한도초과'])}" if 추진비["한도초과"] else ""
        print(f"      · 기업업무추진비: 계상 {won(추진비['회사계상액'])} → "
              f"한도 {won(추진비['한도'])}, 증빙불비 {won(추진비['적격증빙없는금액'])}"
              f"{한도초과문구} → 손금불산입 {won(추진비손불)}")
    차량손불 = out.get("차량손금불산입", Decimal(0))
    for c in out.get("차량판정들", []):
        print(f"      · 업무용승용차: {c['사유']} → 손금불산입 {won(c['손금불산입액'])}")
    명세서분 = out["가산조정"] - out["감가부인"] - 추진비손불 - 차량손불
    추진비문구 = f" + 추진비 {won(추진비손불)}" if 추진비 else ""
    차량문구 = f" + 승용차 {won(차량손불)}" if 차량손불 else ""
    print(f"      가산(익금산입·손금불산입): {won(out['가산조정'])}  "
          f"(명세서 {won(명세서분)} + 감가부인 {won(out['감가부인'])}{추진비문구}{차량문구})")
    print(f"      차감(손금산입·익금불산입): {won(out['차감조정'])}")

    # 4. 별지3
    print("\n  [4] 별지3 세액조정계산서")
    for s in r["단계"]:
        val = s.get("주석", "") if s["금액"] is None else won(s["금액"])
        star = "  ★" if s.get("최종") else ""
        print(f"      {s['부호'] or ' '} {s['라벨']:<24} {str(val):>14}{star}")
    print(f"      + 법인지방소득세 (위택스 별도)      {won(r['지방소득세']['산출세액']):>14}")
    print(f"      = 총 납부세액                       {won(r['총납부세액']):>14}")

    # 5. 정답지 대조
    정답 = out["정답"]
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

    def opt(flag):
        return argv[argv.index(flag) + 1] if flag in argv else None

    sys.exit(run(opt("--dir") or "data/example/fy2025", opt("--prev")))


if __name__ == "__main__":
    main()
