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


def 자산행(a: dict) -> dict:
    """assets.csv 한 행을 엔진용 딕셔너리로 정규화 (문자열 → 타입)."""
    return {
        "명": a["명"], "구분": a["구분"], "취득일": a["취득일"],
        "취득가": a["취득가"], "기초누계": a["기초누계"], "회사계상액": a.get("회사계상액"),
        "방법": a["방법"], "내용연수": int(str(a["내용연수"]).replace(",", "")),
        "전기이월부인액": a.get("전기이월부인액", 0),
        "업무용승용차": str(a.get("업무용승용차")).lower() == "true",
    }


def 차량행(c: dict) -> dict:
    """cars.csv 한 행을 엔진용 딕셔너리로 정규화 (문자열 → 타입)."""
    return {
        "명": c["명"],
        "감가상각비": c.get("감가상각비", 0),
        "기타관련비용": c.get("기타관련비용", 0),
        "전용보험가입": str(c.get("전용보험가입")).lower() == "true",
        "운행기록부작성": str(c.get("운행기록부작성")).lower() == "true",
        "업무사용비율": c.get("업무사용비율", 0),
    }


def 로드(d) -> dict:
    """사업연도 폴더 하나의 CSV들을 전부 읽어 딕셔너리로. (Path 또는 문자열)"""
    from pathlib import Path
    d = Path(d)

    def opt(name):
        return parse_file(d / name) if (d / name).exists() else None

    return {
        "회사": parse_key_value(d / "company.csv"),
        "손익계산서": parse_file(d / "income_statement.csv"),
        "재무상태표": opt("balance_sheet.csv"),
        "자산대장": parse_file(d / "assets.csv"),
        "차량대장": opt("cars.csv") or [],
        "조정": parse_file(d / "adjustments.csv"),
        "정답": parse_key_value(d / "answer.csv") if (d / "answer.csv").exists() else None,
    }
