"""금액 처리 — 세무 계산의 정확성 급소.

JS 버전은 부동소수(number)를 Math.floor로 눌러 오차를 우연히 피했지만,
Python 버전은 처음부터 Decimal(십진 임의정밀도)을 써서 오차를 원천 차단한다.
(notes/기술스택-결정.md §1 참고)

원(₩)은 실무상 소수 단위(전)가 없으므로 계산 결과는 원 단위로 절사/반올림해 확정한다.
"""

from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP


def 원(v) -> Decimal:
    """숫자·문자열을 원 단위 Decimal로 변환. 천단위 쉼표와 빈 값 허용."""
    if v is None or v == "":
        return Decimal(0)
    if isinstance(v, Decimal):
        return v
    if isinstance(v, bool):  # True/False가 숫자로 새는 것 방지
        raise TypeError("금액에 불리언이 들어왔습니다")
    return Decimal(str(v).replace(",", ""))


def 절사(d: Decimal) -> Decimal:
    """원 단위 미만 버림 (JS Math.floor에 대응). 세법 상각·세액 계산의 기본 규칙."""
    return d.quantize(Decimal(1), rounding=ROUND_DOWN)


def 반올림(d: Decimal) -> Decimal:
    """사사오입 — 필드에 따라 절사 대신 쓴다 (장부 프로그램의 기본 관행)."""
    return d.quantize(Decimal(1), rounding=ROUND_HALF_UP)
