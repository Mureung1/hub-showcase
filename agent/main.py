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
