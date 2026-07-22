"""입력 무결성 검증기.

수기 입력은 반드시 오타가 난다. 재무제표는 내부 정합성이 강해서 오타를 기계가 잡을 수 있다.
사람이 눈으로 검산할 필요가 없다 — 이게 이 모듈의 존재 이유. (PLAN-3 Step 3A-3)
"""

from decimal import Decimal

from taxengine.money import 원
from taxengine.loader import 합계


def 검증(재무상태표=None, 손익계산서=None, 자산대장=None) -> dict:
    """반환: {'ok': bool, 'checks': [{'name','ok','detail'}], '당기순이익': Decimal|None}"""
    checks = []

    def add(name, ok, detail):
        checks.append({"name": name, "ok": ok, "detail": detail})

    # 1. 재무상태표 대차: 자산 − 자산차감 = 부채 + 자본
    if 재무상태표 is not None:
        자산 = 합계([r for r in 재무상태표 if r.get("구분") == "자산"], "금액")
        자산차감 = 합계([r for r in 재무상태표 if r.get("구분") == "자산차감"], "금액")
        부채 = 합계([r for r in 재무상태표 if r.get("구분") == "부채"], "금액")
        자본 = 합계([r for r in 재무상태표 if r.get("구분") == "자본"], "금액")
        좌 = 자산 - 자산차감
        우 = 부채 + 자본
        detail = f"자산 {좌:,} vs 부채+자본 {우:,}"
        if 좌 != 우:
            detail += f" · 차이 {좌 - 우:,}"
        add("재무상태표 대차평형 (자산−차감 = 부채+자본)", 좌 == 우, detail)

    # 2. 손익계산서: 당기순이익 = 수익 − 비용
    당기순이익 = None
    if 손익계산서 is not None:
        수익 = 합계([r for r in 손익계산서 if r.get("구분") == "수익"], "금액")
        비용 = 합계([r for r in 손익계산서 if r.get("구분") == "비용"], "금액")
        당기순이익 = 수익 - 비용
        add("손익계산서 합계 정상", 수익 > 0 and 비용 >= 0,
            f"수익 {수익:,} − 비용 {비용:,} = 당기순이익 {당기순이익:,}")

    # 3. 자산대장: 기초누계 ≤ 취득가, 필수 필드 존재
    if 자산대장 is not None:
        문제 = []
        for a in 자산대장:
            취득가 = 원(a.get("취득가", 0))
            기초누계 = 원(a.get("기초누계", 0))
            if 기초누계 > 취득가:
                문제.append(f"{a.get('명')}: 기초누계 > 취득가")
            if not a.get("취득일") or 취득가 == 0:
                문제.append(f"{a.get('명')}: 취득일/취득가 누락")
        add("자산대장 정합성", len(문제) == 0, " · ".join(문제) if 문제 else f"자산 {len(자산대장)}건 정상")

    return {"ok": all(c["ok"] for c in checks), "checks": checks, "당기순이익": 당기순이익}
