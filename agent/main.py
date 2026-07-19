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
    freq_pct: int | None = None       # 등장 %
    required_ratio: int | None = None  # 필수율 %


class Deviation(BaseModel):
    item_id: str
    topic: str
    baseline: str      # baseline 수준
    deviation: str     # 더 높거나 추가로 요구되는 것
    evidence: str      # 근거 인용
    explanation: str   # 이 편차가 왜 중요한가 (해설)
    confidence: str    # high | mid | low
    ratio: str         # 같은 직군 내 등장 비율
    related_stat: str | None = None  # 통계 화면의 근거 블록 앵커 (예: "#items")


class UnchangedItem(BaseModel):
    item_id: str
    title: str
    note: str  # 편차 없음 한 줄 해설


class RawLine(BaseModel):
    text: str
    mark_n: int | None = None  # 하이라이트 번호 (해석 카드와 짝)


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
    raw_sections: list[RawSection]    # 원문 (하이라이트 번호 포함)
    interpretations: list[Interpretation]  # 번호별 상세 해석
    unchanged_note: str               # 하이라이트 없는 문장 안내


class ReverseResponse(BaseModel):
    job: str
    scope: ReverseScope
    baseline: list[BaselineItem]
    deviations: list[Deviation]
    unchanged: list[UnchangedItem]
    posting: PostingView | None
    agent_version: str
    source: str  # fixture | llm


@app.post("/reverse", response_model=ReverseResponse)
def reverse(req: ReverseRequest):
    # [뼈대] 고정 응답. req.items(진짜 통계값)는 아직 읽지 않는다 — 실제 역산에서 baseline 비교의 입력이 된다.
    baseline = [
        BaselineItem(item_id="crud-api", title="CRUD REST API 완성", freq_pct=68, required_ratio=92,
                     desc='한 도메인의 생성·조회·수정·삭제를 DB와 연결해 배포까지 완성하는 경험입니다. 공고의 68%가 API 개발을 요구하는데, "만들어 봤다"가 아니라 "배포해서 돌려 봤다"를 기대하는 문장이 다수입니다.'),
        BaselineItem(item_id="error-handling", title="예외·검증·에러 응답 설계", freq_pct=50, required_ratio=73,
                     desc="성공 응답만이 아니라 요청 검증, 실패 응답, 예외 흐름을 설계하는 능력입니다. 테스트 요구가 1년 새 17%→40%로 늘어난 흐름과 맞물려, 실패 케이스를 다뤄 본 흔적을 봅니다."),
        BaselineItem(item_id="rdb-schema", title="RDB 스키마·기본 쿼리", freq_pct=67, required_ratio=84,
                     desc="테이블 설계와 조인·인덱스의 기본입니다. MySQL·RDB가 67% 등장에 필수율 84%로, 백엔드 신입에게는 사실상 전제 조건에 해당합니다."),
        BaselineItem(item_id="tx-basic", title="트랜잭션 기본 이해", freq_pct=27, required_ratio=65,
                     desc="커밋·롤백과 격리수준의 개념 이해입니다. 전체에선 27% 등장이지만, 기업군 뷰에서 보듯 핀테크·금융에서는 심화 요구로 올라가는 대표 항목입니다."),
        BaselineItem(item_id="git-collab", title="Git·협업 기록", freq_pct=33, required_ratio=40,
                     desc="브랜치·PR로 변경 단위를 나눠 협업한 기록입니다. 공고 등장은 33%지만 포트폴리오 평가에서는 사실상 기본기로 취급됩니다."),
        BaselineItem(item_id="deploy-container", title="배포·컨테이너 경험", freq_pct=43, required_ratio=55,
                     desc="Docker로 빌드해 클라우드에 배포해 본 경험입니다. 1년 새 필수율이 20%→55%로 뛴 우대→필수 이동 항목으로, baseline의 경계선에 걸쳐 있습니다."),
        BaselineItem(item_id="test-habit", title="테스트 작성 습관", freq_pct=40, required_ratio=55,
                     desc="단위 테스트를 습관처럼 작성하는지 봅니다. 등장 40%에 필수율이 1년 새 급등해, 이제 우대가 아니라 기대치의 일부로 읽는 것이 안전합니다."),
    ]
    deviations = []
    unchanged = []
    posting = None
    if req.scope.level in ("cluster", "posting"):
        deviations = [
            Deviation(item_id="tx-integrity", topic="트랜잭션", baseline="트랜잭션 개념 이해", deviation="동시성·롤백·정합성 보장까지",
                      evidence='"결제·정산의 정확성" 반복 문장 · 회사 기술 블로그',
                      explanation="돈을 다루는 도메인은 데이터 정합성이 곧 서비스 신뢰입니다. 그래서 신입에게도 격리수준과 롤백 시나리오를 \"설명할 수 있는\" 수준을 기대합니다.",
                      confidence="high", ratio="같은 직군 27%", related_stat="#items"),
            Deviation(item_id="security", topic="보안", baseline="공통 항목에 없음", deviation="신규 · 인증·인가·민감정보 암호화",
                      evidence="회사 보안 정책·기술 블로그 (공고 문장은 간접적)",
                      explanation="공고 문장에는 잘 드러나지 않지만 2차 자료에서 반복되는 요구입니다. 인증·인가 구현 경험이 있으면 이 기업군에서 추가 점수가 됩니다.",
                      confidence="mid", ratio="같은 직군 22%", related_stat=None),
            Deviation(item_id="high-volume", topic="대용량 처리", baseline="성능 고려", deviation="대량 트래픽·데이터 처리 경험",
                      evidence='"일 수백만 건 거래" 문장',
                      explanation="거래량 언급은 단순 수사가 아니라 배치 처리·조회 성능을 고민해 본 경험을 묻는 신호입니다. baseline의 \"성능 고려\"보다 한 단계 위입니다.",
                      confidence="mid", ratio="같은 직군 18%", related_stat="#difficulty"),
        ]
        unchanged = [
            UnchangedItem(item_id="crud-api", title="CRUD REST API 완성", note="이 기업군도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
            UnchangedItem(item_id="error-handling", title="예외·검증·에러 응답", note="실패 흐름 설계는 전 기업군 공통입니다. 이 기업군이라고 더 요구하지도, 덜 보지도 않습니다."),
            UnchangedItem(item_id="rdb-schema", title="RDB 스키마·기본 쿼리", note="스키마 설계 기본기는 공통 기대치 그대로입니다. 심화(정합성)는 트랜잭션 편차가 담당합니다."),
            UnchangedItem(item_id="git-collab", title="Git 브랜치·PR 협업", note="협업 기록 요구는 기업군과 무관하게 동일합니다. 준비했다면 어디에나 통하는 항목입니다."),
        ]
    if req.scope.level == "posting":
        posting = PostingView(
            posting_id=req.scope.posting_id or "R001",
            company="A 핀테크사",
            title="백엔드 개발자 신입 채용",
            summary=Interpretation(
                n=None, title="종합 해석 — 이 공고가 찾는 사람",
                body="기능을 만드는 사람보다 돈이 새지 않게 지키는 사람을 찾습니다. baseline 7개 항목 중 5개는 공통 기대치 그대로이고, 트랜잭션 정합성과 장애 대응 두 축이 이 공고의 실질 변별점입니다.",
                confidence="high", ratio="편차 3건 · baseline 일치 5건",
                sources=[SourceRef(type="posting")],
            ),
            raw_sections=[
                RawSection(section="주요업무", lines=[
                    RawLine(text="결제·정산 시스템 서버 개발 및 운영"),
                    RawLine(text="거래 데이터 처리 파이프라인과 정산 배치 개발"),
                    RawLine(text="가맹점 정산 어드민 백엔드 개발"),
                    RawLine(text="유관 부서와의 협업을 통한 정책 반영"),
                ]),
                RawSection(section="자격요건", lines=[
                    RawLine(text="Java/Spring 기반 서버 개발 경험이 있으신 분"),
                    RawLine(text="RDB 데이터 모델링과 쿼리 작성에 익숙하신 분"),
                    RawLine(text="대용량 트랜잭션을 안전하게 처리한 경험", mark_n=1),
                    RawLine(text="REST API 설계·개발 경험"),
                    RawLine(text="Git 기반 협업이 익숙하신 분"),
                ]),
                RawSection(section="우대사항", lines=[
                    RawLine(text="장애 상황에서도 데이터 정합성 유지를 고민해 본 분", mark_n=2),
                    RawLine(text="대규모 트래픽 처리 경험", mark_n=3),
                    RawLine(text="Kafka 등 메시지큐 사용 경험"),
                    RawLine(text="금융 도메인에 대한 이해"),
                    RawLine(text="테스트 코드 작성이 익숙하신 분"),
                ]),
            ],
            interpretations=[
                Interpretation(n=1, title="트랜잭션 — baseline \"기본 이해\"를 훌쩍 넘는 요구",
                               body="자격요건(필수)에 \"대용량\"과 \"안전한 처리\"가 함께 있습니다. 정산 도메인은 실패한 거래를 다시 처리해도 금액이 두 번 빠지면 안 되기 때문에, 격리수준·멱등성·재처리 설계를 설명할 수 있는 수준을 기대한다고 읽힙니다.",
                               confidence="high", ratio="같은 직군 27%", sources=[SourceRef(type="posting")]),
                Interpretation(n=2, title="장애·정합성 — 라벨은 우대, 실질은 필수에 가까움",
                               body="우대사항에 있지만 주요업무의 \"정산 배치\"와 묶어 읽으면 얘기가 다릅니다. 배치가 실패했을 때의 복구를 고민해 본 사람을 찾는 것이므로, 통계의 라벨 vs 현실 패턴이 이 공고에서도 나타난다고 판단됩니다.",
                               confidence="high", ratio="같은 직군 22%", sources=[SourceRef(type="posting"), SourceRef(type="company_blog")]),
                Interpretation(n=3, title="대규모 트래픽 — 신입에게는 이해와 시도를 기대",
                               body="신입·주니어 공고에서 이 문장은 실무 경험 증명보다, 부하가 어디서 생기고 어떻게 측정하는지 이해하고 토이 수준이라도 시도해 봤는지를 묻는 신호로 읽는 것이 합리적입니다.",
                               confidence="mid", ratio="같은 직군 18%", sources=[SourceRef(type="posting")]),
            ],
            unchanged_note="하이라이트 없는 문장들은 baseline 공통 항목과 같은 요구입니다 — Java/Spring·RDB·REST API·Git은 기준선 그대로 준비하면 됩니다.",
        )
    return ReverseResponse(
        job=req.job, scope=req.scope,
        baseline=baseline, deviations=deviations, unchanged=unchanged, posting=posting,
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
