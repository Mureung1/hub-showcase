"""CSV 입력 로더. 표준 라이브러리 csv를 쓰되 # 주석줄·빈줄을 건너뛴다.

(JS 버전의 io/csv.js에 대응. Python은 'io'가 표준 모듈명이라 loader로 이름 지음.)
"""

import csv
from decimal import Decimal


def _유효줄(path):
    """빈 줄과 # 로 시작하는 주석 줄을 뺀 줄들을 돌려준다."""
    with open(path, encoding="utf-8-sig") as f:  # utf-8-sig: 엑셀이 붙이는 BOM 처리
        return [ln for ln in f if ln.strip() and not ln.lstrip().startswith("#")]


def parse_file(path) -> list[dict]:
    """헤더 기준 CSV → 딕셔너리 리스트."""
    return list(csv.DictReader(_유효줄(path)))


def parse_key_value(path) -> dict:
    """key,value 2열 CSV → 딕셔너리. 값은 자동으로 숫자/불리언 변환."""
    obj = {}
    for row in parse_file(path):
        obj[row["key"]] = coerce(row["value"])
    return obj


def coerce(v):
    """문자열 → 정수/불리언/문자열 자동 변환. 천단위 쉼표 처리.

    금액은 여기서 Decimal로 만들지 않고 정수/문자열로 두었다가,
    엔진에서 money.원()으로 감싸 Decimal로 확정한다(부동소수 유입 차단).
    """
    if v is None or v == "":
        return None
    if v == "true":
        return True
    if v == "false":
        return False
    n = v.replace(",", "")
    if _정수인가(n):
        return int(n)
    return v


def _정수인가(s: str) -> bool:
    return bool(s) and (s[1:] if s[0] == "-" else s).isdigit()


def 합계(rows: list[dict], col: str) -> Decimal:
    """행들의 특정 컬럼을 Decimal로 합산."""
    from taxengine.money import 원
    return sum((원(r.get(col, 0)) for r in rows), Decimal(0))
