"""API 요청/응답 바디 모델.

필드명·구조는 일부러 taxengine.loader.로드()가 돌려주는 딕셔너리(= data/templates/*.csv의
한글 헤더)와 1:1로 맞췄다 — CSV·DB·API가 서로 다른 이름 체계를 쓰면 그 사이 어딘가에서
번역 버그가 난다. 금액·비율은 CSV의 쉼표 문자열이 아니라 JSON 네이티브 타입(int/bool/float)
으로 받는다 — JSON API 계약으로는 이게 맞다(콤마 문자열 파싱은 CSV 전용 관행).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class 지배주주입력(BaseModel):
    명: str
    지분율: float = Field(description="퍼센트(예: 33.33), bp 아님")


class 회사생성요청(BaseModel):
    """POST /companies — 온보딩에서 최초 1회 제출하는 회사 "거의 고정" 프로필.

    회사명 외에는 전부 선택 — 기존 호출(회사명만)과 하위호환된다.
    """

    회사명: str
    설립연도: int | None = None
    중소기업: bool = False
    부동산임대업주업: bool = False
    상시근로자수: int | None = None
    지배주주목록: list[지배주주입력] = []


class 회사수정요청(BaseModel):
    """PATCH /companies/{id} — 보낸 필드만 반영한다(부분 수정). 지배주주목록은 명단 전체 교체."""

    회사명: str | None = None
    설립연도: int | None = None
    중소기업: bool | None = None
    부동산임대업주업: bool | None = None
    상시근로자수: int | None = None
    지배주주목록: list[지배주주입력] | None = None


class 회사프로필입력(BaseModel):
    """사업연도 하나의 법인 프로필 — company.csv에 대응."""

    사업연도개시일: str = Field(description="ISO 'YYYY-MM-DD'")
    사업연도종료일: str
    중소기업: bool = False
    부동산임대업주업: bool = False
    상시근로자수: int | None = None
    지배주주지분율: float | None = Field(default=None, description="퍼센트(예: 100.0 = 100%), bp 아님")
    기납부세액: int = 0
    이월결손금: int = 0
    공제감면세액: int = 0
    가산세: int = 0
    기부금한도초과: int = 0
    수입금액: int | None = Field(default=None, description="비우면 기업업무추진비 한도 자동계산 생략")
    기업업무추진비_증빙불비금액: int = 0


class 재무제표행입력(BaseModel):
    """balance_sheet.csv / income_statement.csv 한 줄."""

    계정: str
    구분: str
    금액: int


class 자산행입력(BaseModel):
    """assets.csv 한 줄."""

    명: str
    구분: str
    취득일: str
    취득가: int
    기초누계: int = 0
    회사계상액: int | None = Field(default=None, description="비우면 상각범위액을 그대로 계상액으로 간주")
    방법: str | None = None
    내용연수: int
    전기이월부인액: int = 0
    업무용승용차: bool = False


class 차량행입력(BaseModel):
    """cars.csv 한 줄."""

    명: str
    감가상각비: int = 0
    기타관련비용: int = 0
    전용보험가입: bool = False
    운행기록부작성: bool = False
    업무사용비율: float | None = Field(default=None, description="퍼센트(0~100), 운행기록부 작성 시만")


class 조정행입력(BaseModel):
    """adjustments.csv 한 줄."""

    과목: str
    구분: str
    금액: int
    소득처분: str | None = None
    근거: str | None = None


class 정답지입력(BaseModel):
    """answer.csv — 값이 있는 항목만 채운다."""

    각사업연도소득: int | None = None
    과세표준: int | None = None
    산출세액: int | None = None
    차감납부세액: int | None = None
    지방소득세: int | None = None


class 사업연도생성요청(BaseModel):
    """POST /companies/{id}/fiscal-years 바디 — 사업연도 폴더 하나 전체에 대응."""

    회사: 회사프로필입력
    손익계산서: list[재무제표행입력]
    재무상태표: list[재무제표행입력] | None = None
    자산대장: list[자산행입력] = []
    차량대장: list[차량행입력] = []
    조정: list[조정행입력] = []
    정답: 정답지입력 | None = None
