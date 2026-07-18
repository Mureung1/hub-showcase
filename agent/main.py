# CareerSignal 에이전트 서비스 (FastAPI) — 뼈대 슬라이스
#
# 지금 단계의 역할: "에이전트 자리" 만들기.
# POST /extract 는 입출력 계약(설계 문서 11장)만 지키는 고정(fixture) 응답을 준다.
# 3b 슬라이스에서 이 고정 응답이 실제 LLM 추출(LangChain)로 교체된다 — 계약은 그대로.
#
# 실행: agent 폴더에서
#   python -m venv .venv
#   .venv\Scripts\activate      (Windows)
#   pip install -r requirements.txt
#   uvicorn main:app --port 8000

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CareerSignal Agent", version="0.1.0")


# ---------- 계약: 입력 ----------
class ExtractRequest(BaseModel):
    posting_id: str
    raw_text: str  # 공고 원문 전체 (LLM 위키·RAG의 입력도 이 원문이다)


# ---------- 계약: 출력 ----------
class Skill(BaseModel):
    name: str
    slug: str
    requirement: str  # required | preferred


class AdvancedSpan(BaseModel):
    type: str  # traffic | concurrency | incident
    text: str  # 원문 문장 그대로 (근거 인용)


class ExtractResponse(BaseModel):
    posting_id: str
    skills: list[Skill]
    out_of_role_tags: list[str]
    advanced_spans: list[AdvancedSpan]
    reality_tags: list[str]
    axis_mentions: list[str]
    impl_level_signals: list[str]
    confidence: str  # high | medium | low
    agent_version: str
    source: str  # fixture | llm — 3b에서 llm으로 바뀐다


@app.get("/health")
def health():
    return {"status": "ok", "service": "agent"}


# ---------- 역산 계약 ----------
class ReverseScope(BaseModel):
    level: str  # overall | cluster | posting
    cluster_tag: str | None = None
    posting_id: str | None = None


class ReverseRequest(BaseModel):
    job: str
    scope: ReverseScope
    items: list[dict]  # 통계 items (역산 입력 계약) — Express가 계산해 첨부
    baseline: list[dict]  # baseline 기준표 — 구축 전에는 빈 배열


class BaselineItem(BaseModel):
    item_id: str
    title: str
    desc: str


class Deviation(BaseModel):
    item_id: str
    topic: str
    baseline: str  # baseline 수준
    deviation: str  # 더 높거나 추가로 요구되는 것
    evidence: str
    confidence: str  # high | mid | low
    ratio: str  # 같은 직군 내 등장 비율


class PostingView(BaseModel):
    company: str
    quote: str
    interpret: str
    confidence: str
    note: str


class ReverseResponse(BaseModel):
    job: str
    scope: ReverseScope
    baseline: list[BaselineItem]
    deviations: list[Deviation]
    posting: PostingView | None
    agent_version: str
    source: str  # fixture | llm


@app.post("/reverse", response_model=ReverseResponse)
def reverse(req: ReverseRequest):
    # [뼈대] 고정 응답. req.items(진짜 통계값)는 아직 읽지 않는다 — 실제 역산에서 baseline 비교의 입력이 된다.
    baseline = [
        BaselineItem(item_id="crud-api", title="CRUD REST API 완성", desc="한 도메인의 생성·조회·수정·삭제를 DB와 연결해 배포 가능한 API로 완성합니다."),
        BaselineItem(item_id="error-handling", title="예외·검증·에러 응답", desc="요청 검증과 실패 응답을 설계합니다. 성공 응답만 다루는 수준을 넘어섭니다."),
        BaselineItem(item_id="rdb-schema", title="RDB 스키마·기본 쿼리", desc="테이블 설계와 조인·인덱스의 기본을 이해하고 적용합니다."),
        BaselineItem(item_id="git-collab", title="Git 브랜치·PR 협업", desc="변경 단위를 나눠 브랜치·PR로 협업한 기록을 남깁니다."),
    ]
    deviations = []
    posting = None
    if req.scope.level in ("cluster", "posting"):
        deviations = [
            Deviation(item_id="tx-integrity", topic="트랜잭션", baseline="트랜잭션 개념 이해", deviation="동시성·롤백·정합성 보장까지", evidence='근거: "결제·정산의 정확성" 반복 문장 · 회사 기술 블로그', confidence="high", ratio="같은 직군 27%"),
            Deviation(item_id="security", topic="보안", baseline="공통 항목에 없음", deviation="신규 · 인증·인가·민감정보 암호화", evidence="근거: 회사 보안 정책·기술 블로그 (공고 문장은 간접적)", confidence="mid", ratio="같은 직군 22%"),
            Deviation(item_id="high-volume", topic="대용량 처리", baseline="성능 고려", deviation="대량 트래픽·데이터 처리 경험", evidence='근거: "일 수백만 건 거래" 문장', confidence="mid", ratio="같은 직군 18%"),
        ]
    if req.scope.level == "posting":
        posting = PostingView(
            company="A 핀테크사 백엔드 공고",
            quote='"대용량 트랜잭션을 안전하게 처리한 경험", "장애 상황에서도 데이터 정합성 유지"',
            interpret="baseline의 '트랜잭션 이해'를 넘어 동시성·정합성 심화를 요구합니다. 롤백·재처리 설계 경험을 보여줄 수 있으면 이 공고의 핵심 편차를 정면으로 채웁니다.",
            confidence="high",
            note="CRUD·Git 같은 baseline 공통 항목은 편차가 없어 접어 두었습니다. 이 공고에서 실제로 갈리는 지점은 트랜잭션 정합성입니다.",
        )
    return ReverseResponse(
        job=req.job, scope=req.scope,
        baseline=baseline, deviations=deviations, posting=posting,
        agent_version="0.1.0", source="fixture",
    )


@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest):
    # [뼈대] 고정 응답. raw_text 는 아직 읽지 않는다 — 3b에서 LLM이 여기서 추출한다.
    return ExtractResponse(
        posting_id=req.posting_id,
        skills=[
            Skill(name="Java", slug="java", requirement="required"),
            Skill(name="Spring Boot", slug="spring-boot", requirement="required"),
            Skill(name="Docker", slug="docker", requirement="preferred"),
        ],
        out_of_role_tags=["infra_deploy", "test"],
        advanced_spans=[
            AdvancedSpan(type="traffic", text="대용량 트래픽 환경에서의 서비스 개발 경험이 있으신 분"),
        ],
        reality_tags=["project_experience"],
        axis_mentions=["performance"],
        impl_level_signals=[],
        confidence="low",  # 고정 응답이므로 낮음으로 정직하게 표기
        agent_version="0.1.0",
        source="fixture",
    )
