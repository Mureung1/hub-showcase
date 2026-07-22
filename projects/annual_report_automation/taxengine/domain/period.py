"""사업연도 월수 — 신설·해산 등으로 12개월 미만인 사업연도의 월할 계산 분모.

engine/depreciation.py의 사용월수(자산이 사업연도 안에서 몇 개월 쓰였나)와는
다른 개념이다: 이건 사업연도 자체의 길이를 잰다.
"""

from datetime import date


def 사업연도월수(개시일: str, 종료일: str) -> int:
    개시 = date.fromisoformat(개시일)
    종료 = date.fromisoformat(종료일)
    return (종료.year - 개시.year) * 12 + (종료.month - 개시.month) + 1
