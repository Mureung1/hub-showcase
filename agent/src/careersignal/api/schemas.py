"""FastAPI 요청·응답 모델 전량.

`agent/main.py` 에 있던 모델을 그대로 옮긴 것이다. **형태를 바꾸지 않는다.** 필드
이름과 기본값, 선택 여부가 그대로여야 화면(React)과 서버(Express)가 고쳐지지 않는다.
계약은 `agent/data/demo_seed/CONTRACT.md` 5장과 docs/architecture.md 10~11장이다.

응답 모델은 `analysis_outputs.payload` 를 검증하는 자리이기도 하다. 저장된 payload 를
이 모델로 통과시키면, 에이전트가 만든 사전이 화면 계약과 어긋났을 때 화면이 아니라
여기서 걸린다.
"""

from __future__ import annotations

from pydantic import BaseModel


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
    source: str  # 어디서 온 결과인가 — CONTRACT 5장 B 의 `source` 값


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
    freq_pct: int | None = None       # 등장 %
    required_ratio: int | None = None  # 필수율 %


class Deviation(BaseModel):
    item_id: str
    topic: str
    baseline: str      # baseline 수준
    deviation: str     # 더 높거나 추가로 요구되는 것
    evidence: str      # 근거 인용
    explanation: str   # 이 편차가 왜 중요한가 (해석)
    confidence: str    # high | mid | low
    ratio: str         # 같은 직군 내 등장 비율
    related_stat: str | None = None  # 통계 화면의 근거 블록 앵커 (예: "#items")


class UnchangedItem(BaseModel):
    item_id: str
    title: str
    note: str  # 편차 없음 한 줄 해석


class RawLine(BaseModel):
    text: str
    mark_n: int | None = None    # 편차 번호 — 노랑 하이라이트, 편차 해석 카드와 짝
    base_n: int | None = None    # baseline 번호 — 하이라이트 없음, 베이스라인 해석 카드와 짝
    base_ref: str | None = None  # 대응하는 baseline 항목 제목(라벨)
    note_n: int | None = None    # 신호 번호 — 파란 하이라이트, 나머지 해석 카드와 짝


class BaselineNote(BaseModel):
    n: int
    base_ref: str  # baseline 항목 제목
    body: str


class SignalNote(BaseModel):
    n: int
    title: str
    body: str


class RawSection(BaseModel):
    section: str  # 주요업무 | 자격요건 | 우대사항
    lines: list[RawLine]


class SourceRef(BaseModel):
    type: str  # posting | company_blog | official
    url: str | None = None


class Interpretation(BaseModel):
    n: int | None = None  # 원문 하이라이트 번호. None이면 종합 해석
    title: str
    body: str
    confidence: str
    ratio: str | None = None
    sources: list[SourceRef] = []


class PostingView(BaseModel):
    posting_id: str
    company: str
    title: str
    summary: Interpretation           # 종합 해석 (이 공고가 찾는 사람)
    raw_sections: list[RawSection]    # 원문 (세 종류 주석 번호 포함)
    interpretations: list[Interpretation]  # 편차 해석 (mark_n과 짝)
    baseline_notes: list[BaselineNote]     # 베이스라인 해석 (base_n과 짝)
    signal_notes: list[SignalNote]         # 나머지 해석 (note_n과 짝)
    unchanged_note: str


class ReverseResponse(BaseModel):
    job: str
    scope: ReverseScope
    baseline: list[BaselineItem]
    deviations: list[Deviation]
    unchanged: list[UnchangedItem]
    posting: PostingView | None
    agent_version: str
    source: str  # stored | cache | agent


# ---------- 합격 전략 계약 ----------
class ConditionsRequest(BaseModel):
    job: str
    scope: ReverseScope
    reverse: dict  # 채용공고 해석 응답 전체 — 합격 전략의 유일한 분석 입력


class CheckItem(BaseModel):
    item_id: str
    title: str
    subtitle: str
    reason: str               # 왜 필요한가 (근거)
    evidence_needed: str      # 증명 산출물·활동
    channels: list[str]       # essay | portfolio | interview (복수)
    kind: str = "project"     # project(산출물) | story(서사) | study(학습 — 면접 검증)
    is_deviation: bool = False
    dev_n: int | None = None  # 역산 편차 번호 연결
    required: bool = True
    have: bool = False        # 초기 보유값 — 화면에서 사용자가 토글


class PortfolioHighlight(BaseModel):
    title: str
    body: str
    tips: list[str]
    linked_item_ids: list[str]


class IntroOrder(BaseModel):
    cluster: str
    steps: list[str]  # 첫 번째가 강조 순서 1순위


class Narrative(BaseModel):
    problem: str
    solve: str
    growth: str


class EssayCard(BaseModel):
    kind: str  # deviation | narrative_polish
    title: str
    body: str
    narrative: Narrative | None = None
    sample_sentence: str | None = None
    tips: list[str] = []
    linked_item_ids: list[str] = []


class InterviewCard(BaseModel):
    kicker: str
    question: str
    followups: list[str]
    point: str
    linked_item_ids: list[str] = []


class PortfolioStrategy(BaseModel):
    highlights: list[PortfolioHighlight]
    intro_orders: list[IntroOrder]


class ConditionsResponse(BaseModel):
    job: str
    scope: ReverseScope
    checklist: list[CheckItem]
    portfolio: PortfolioStrategy
    essay: list[EssayCard]
    interview: list[InterviewCard]
    agent_version: str
    source: str


# ---------- 준비 로드맵 계약 ----------
class RoadmapRequest(BaseModel):
    job: str
    scope: ReverseScope
    conditions: dict          # 합격 전략 응답 전체 — 준비 로드맵의 유일한 분석 입력
    checks: dict[str, bool] = {}  # item_id → 보유 여부 (적용된 체크 상태)


class Fill(BaseModel):
    item_id: str
    label: str
    kind: str  # dev(편차) | normal | study


class ProjectStep(BaseModel):
    n: int
    phase: str      # 예: "STEP 01 · 3주"
    weeks: int
    priority: str   # vhigh | high | mid
    title: str
    body: str
    deliverable: str
    fills: list[Fill]
    reason_title: str
    reason: str
    tags: list[str]


class StudyTrack(BaseModel):
    phase: str      # 예: "STEP 01~02와 병행"
    priority: str   # vhigh | high | mid | track(별도 트랙)
    title: str
    depth: str      # 어디까지 — 깊이 기준
    reason_title: str
    reason: str
    fills: list[Fill] = []


class CheckRow(BaseModel):
    item_id: str
    title: str
    kind: str            # project | story | study
    is_deviation: bool = False
    dev_n: int | None = None
    required: bool = True
    source_step: str     # 어느 단계에서 채워지는가 (STEP 01 | 병행 | 상시 | 보유)


class RoadmapResponse(BaseModel):
    job: str
    scope: ReverseScope
    project_steps: list[ProjectStep]
    study_tracks: list[StudyTrack]
    check_rows: list[CheckRow]
    agent_version: str
    source: str


# ---------- 오류 본문 ----------
class ErrorBody(BaseModel):
    """실패 응답의 본문. `{"error": {"code", "message"}}` 한 모양만 쓴다.

    화면이 오류를 하나의 모양으로만 읽게 한다. 라우트마다 다른 모양을 내면
    Express 가 라우트 수만큼 분기를 갖게 된다.
    """

    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


__all__ = [
    "AdvancedSpan",
    "BaselineItem",
    "BaselineNote",
    "CheckItem",
    "CheckRow",
    "ConditionsRequest",
    "ConditionsResponse",
    "Deviation",
    "ErrorBody",
    "ErrorResponse",
    "EssayCard",
    "ExtractRequest",
    "ExtractResponse",
    "Fill",
    "Interpretation",
    "InterviewCard",
    "IntroOrder",
    "Narrative",
    "PortfolioHighlight",
    "PortfolioStrategy",
    "PostingView",
    "ProjectStep",
    "RawLine",
    "RawSection",
    "ReverseRequest",
    "ReverseResponse",
    "ReverseScope",
    "RoadmapRequest",
    "RoadmapResponse",
    "SignalNote",
    "Skill",
    "SourceRef",
    "StudyTrack",
    "UnchangedItem",
]
