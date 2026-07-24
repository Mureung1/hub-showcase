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
                    RawLine(text="결제·정산 시스템 서버 개발 및 운영", note_n=1),
                    RawLine(text="거래 데이터 처리 파이프라인과 정산 배치 개발", note_n=2),
                    RawLine(text="가맹점 정산 어드민 백엔드 개발", note_n=3),
                    RawLine(text="유관 부서와의 협업을 통한 정책 반영", note_n=4),
                ]),
                RawSection(section="자격요건", lines=[
                    RawLine(text="Java/Spring 기반 서버 개발 경험이 있으신 분", base_n=1, base_ref="CRUD REST API 완성"),
                    RawLine(text="RDB 데이터 모델링과 쿼리 작성에 익숙하신 분", base_n=2, base_ref="RDB 스키마·기본 쿼리"),
                    RawLine(text="대용량 트랜잭션을 안전하게 처리한 경험", mark_n=1),
                    RawLine(text="REST API 설계·개발 경험", base_n=3, base_ref="CRUD REST API 완성"),
                    RawLine(text="Git 기반 협업이 익숙하신 분", base_n=4, base_ref="Git·협업 기록"),
                ]),
                RawSection(section="우대사항", lines=[
                    RawLine(text="장애 상황에서도 데이터 정합성 유지를 고민해 본 분", mark_n=2),
                    RawLine(text="대규모 트래픽 처리 경험", mark_n=3),
                    RawLine(text="Kafka 등 메시지큐 사용 경험", note_n=5),
                    RawLine(text="금융 도메인에 대한 이해", note_n=6),
                    RawLine(text="테스트 코드 작성이 익숙하신 분", base_n=5, base_ref="테스트 작성 습관"),
                ]),
            ],
            baseline_notes=[
                BaselineNote(n=1, base_ref="CRUD REST API 완성",
                             body='"경험이 있으신 분"의 실질은 완성해 본 사람입니다. 한 도메인을 배포까지 완성한 프로젝트면 이 문장은 충분히 증명됩니다 — baseline 기대치 그대로이고, 이 회사만의 추가 요구는 없습니다.'),
                BaselineNote(n=2, base_ref="RDB 스키마·기본 쿼리",
                             body="정산 도메인이라 모델링 요구가 형식적이지 않습니다. 다만 기대 수준 자체는 baseline과 같아서, ERD와 인덱스 설계 근거 문서를 준비하면 됩니다. 심화(정합성)는 편차 ①이 담당합니다."),
                BaselineNote(n=3, base_ref="CRUD REST API 완성",
                             body="자원 설계와 에러 응답까지가 백엔드 신입 기대치의 표준입니다. baseline 준비 그대로 통하며, 이 공고에서는 정산 API의 실패 응답 설계를 예로 들 수 있으면 더 좋습니다."),
                BaselineNote(n=4, base_ref="Git·협업 기록",
                             body="브랜치·PR 기록이 있으면 충족됩니다. 주요업무의 유관 부서 협업(신호 ④)과 연결하면, 코드 협업을 넘어 소통 기록까지 보여줄 수 있는 항목입니다."),
                BaselineNote(n=5, base_ref="테스트 작성 습관",
                             body="라벨은 우대지만 통계상 1년 새 필수화 추세인 항목입니다. 사실상 준비 목록에 넣는 것이 안전하고, 정산 로직처럼 틀리면 안 되는 코드의 테스트가 이 회사에서는 특히 설득력 있습니다."),
            ],
            signal_notes=[
                SignalNote(n=1, title="도메인 신호 — 돈을 다루는 팀",
                           body="결제·정산은 데이터 정합성이 서비스의 본질인 도메인입니다. 자격요건의 트랜잭션 요구(편차 ①)가 왜 필수인지가 이 문장에서 설명됩니다."),
                SignalNote(n=2, title="배치 = 실패·재처리의 세계",
                           body="배치는 중간에 실패하고 다시 돌리는 일이 숙명입니다. 우대의 장애·정합성(편차 ②)이 실질 필수로 읽히는 근거가 바로 이 문장입니다."),
                SignalNote(n=3, title="어드민 개발 — 직무 외 접점",
                           body="어드민 백엔드는 화면·프론트와의 접점이 생길 수 있다는 신호입니다. 통계의 '직무 외 요구' 패턴(공고 63%)이 이 공고에도 나타납니다."),
                SignalNote(n=4, title="정책 협업 — 소통 능력을 봅니다",
                           body="기획·정책 부서와의 소통을 업무로 명시했습니다. 협업 문제 해결 서사(자소서 소재)가 이 공고에서 실제로 평가에 쓰인다는 뜻입니다."),
                SignalNote(n=5, title="Kafka — 우대는 우대로",
                           body="신입에게는 개념 이해와 토이 수준 경험이면 충분합니다. 통계 조합 분석에서도 Kafka는 우대 성격(필수율 15%)으로 나타납니다."),
                SignalNote(n=6, title="금융 도메인 — 관심의 증거",
                           body="전공 지식이 아니라 관심의 증거를 봅니다. 정산·거래 용어에 낯설지 않고, 왜 이 도메인에 지원했는지 말할 수 있는 정도면 됩니다."),
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
            unchanged_note="읽는 법 — 회색 번호는 백엔드 개발자 공통 기대치, 파란 하이라이트는 문장 뒤에 숨은 의미, 노란 하이라이트는 이 회사가 유독 원하는 것입니다. 탭을 눌러 각 해석을 확인하세요.",
        )
    return ReverseResponse(
        job=req.job, scope=req.scope,
        baseline=baseline, deviations=deviations, unchanged=unchanged, posting=posting,
        agent_version="0.1.0", source="fixture",
    )


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


ALL_INTRO_ORDERS = [
    IntroOrder(cluster="핀테크·금융", steps=["정합성·트랜잭션", "보안", "API 설계", "성능"]),
    IntroOrder(cluster="빅테크·플랫폼", steps=["성능·캐시", "대용량 처리", "코드 품질", "정합성"]),
    IntroOrder(cluster="스타트업", steps=["완성·배포 속도", "오너십 서사", "API 설계", "운영 경험"]),
    IntroOrder(cluster="B2B SaaS", steps=["도메인 모델링", "API 설계·안정성", "문서화", "정합성"]),
    IntroOrder(cluster="SI·대기업", steps=["프로세스·문서화", "협업 기록", "안정성", "API 설계"]),
    IntroOrder(cluster="게임사", steps=["실시간 처리·성능", "동시 접속 구조", "최적화 기록", "협업"]),
]


@app.post("/conditions", response_model=ConditionsResponse)
def conditions(req: ConditionsRequest):
    # [뼈대] 고정 응답. req.reverse(역산 출력)는 아직 읽지 않는다 —
    # 실제 구현에서 배정(rule)과 전략 문구(LLM)의 입력이 된다.
    checklist = [
        CheckItem(item_id="crud-api", title="CRUD REST API 프로젝트", subtitle="배포까지 완성한 한 도메인",
                  reason="baseline · 공고 68%가 요구, 필수율 92%",
                  evidence_needed="배포 URL + README + GitHub 커밋 기록",
                  channels=["portfolio"], have=True),
        CheckItem(item_id="error-handling", title="예외·에러 응답 설계", subtitle="실패 케이스 처리와 문서화",
                  reason="baseline · 등장 50%, 테스트 요구 증가와 연동",
                  evidence_needed="실패 케이스 처리 코드 + 설계 문서",
                  channels=["portfolio", "interview"]),
        CheckItem(item_id="tx-integrity", title="트랜잭션·동시성 심화", subtitle="격리수준·멱등성·재처리 설명",
                  reason='편차 · 핀테크 필수, "대용량 트랜잭션 안전 처리" 문장',
                  evidence_needed="동시 주문·재고 차감 시나리오 구현 + 설명 글",
                  channels=["portfolio", "interview"], is_deviation=True, dev_n=1),
        CheckItem(item_id="incident-recovery", title="장애·정합성 대응 경험", subtitle="실패 복구를 고민한 흔적",
                  reason="편차 · 라벨은 우대지만 주요업무와 결합 시 실질 필수",
                  evidence_needed="장애 재현·복구 실험 기록, 회고 글",
                  channels=["essay", "interview"], is_deviation=True, dev_n=2),
        CheckItem(item_id="high-volume", title="대용량 처리 이해", subtitle="부하 지점 측정·개선 시도",
                  reason="편차 · 신입에게는 이해와 시도를 기대",
                  evidence_needed="부하 테스트 + 개선 전후 지표",
                  channels=["portfolio", "interview"], is_deviation=True, dev_n=3),
        CheckItem(item_id="rdb-schema", title="RDB 설계·쿼리 기본기", subtitle="스키마·조인·인덱스",
                  reason="baseline · 등장 67%, 필수율 84%",
                  evidence_needed="ERD + 인덱스 설계 근거 문서",
                  channels=["portfolio", "interview"]),
        CheckItem(item_id="collab-story", title="협업 문제 해결 서사", subtitle="갈등·문제를 해결한 경험",
                  reason="baseline · Git 협업 기록 + 성장 서사형 항목",
                  evidence_needed="문제 → 해결 → 배움 서술 준비",
                  channels=["essay"], kind="story", have=True),
        CheckItem(item_id="security", title="보안 기본 이해", subtitle="인증·인가·암호화",
                  reason="편차 · 2차 자료 근거, 신뢰도 중간이라 우대로 배정",
                  evidence_needed="JWT 인증 구현 + 민감정보 처리 정리",
                  channels=["portfolio"], required=False),
        CheckItem(item_id="tx-theory", title="트랜잭션·DB 이론", subtitle="격리수준·락·MVCC를 설명할 수 있는 수준",
                  reason="편차 ① 면접 검증 · 꼬리질문이 이론 이해를 묻는다",
                  evidence_needed="개념 정리 노트 + 내 프로젝트 적용 사례 연결",
                  channels=["interview"], kind="study"),
        CheckItem(item_id="spring-internals", title="Spring 동작 원리", subtitle="DI·프록시·요청 흐름을 그릴 수 있는 수준",
                  reason="프레임워크 이해 깊이 · 신입 면접 단골 검증 지점",
                  evidence_needed="동작 흐름 그림 + @Transactional 원리 설명",
                  channels=["interview"], kind="study"),
        CheckItem(item_id="cs-basics", title="CS 기본기 — 네트워크·운영체제", subtitle="HTTP/TCP·프로세스와 스레드·동시성 원인",
                  reason="편차 ①·②의 이론 바탕 · 백엔드 면접 단골 주제",
                  evidence_needed="면접 단골 주제 중심 정리 노트",
                  channels=["interview"], kind="study"),
    ]
    # 소개 순서: 전체 기준이면 6개 전부, 기업군·개별 기준이면 해당 기업군만
    if req.scope.level == "overall" or not req.scope.cluster_tag:
        intro_orders = ALL_INTRO_ORDERS
    else:
        intro_orders = [o for o in ALL_INTRO_ORDERS if o.cluster == req.scope.cluster_tag] or ALL_INTRO_ORDERS
    portfolio = PortfolioStrategy(
        highlights=[
            PortfolioHighlight(title="트랜잭션 정합성을 프로젝트의 주인공으로",
                               body='CRUD 프로젝트에 "동시 주문 시 재고가 음수가 되지 않게 막는" 시나리오를 넣고, README 최상단에서 이 문제를 다뤘다고 선언하세요. 핀테크 지원 시 가장 먼저 읽히는 강조점입니다.',
                               tips=["README 1절: 문제 정의(동시성) → 해결(격리수준·락) → 검증(테스트)", "커밋 이력에 실패 → 수정 과정이 남아 있으면 더 좋습니다"],
                               linked_item_ids=["tx-integrity"]),
            PortfolioHighlight(title="에러 응답과 장애 복구 실험 기록",
                               body='성공 화면 캡처보다 "DB가 죽었을 때 이 API는 어떻게 응답하는가"를 보여주는 문서가 신입 포트폴리오에서 희소합니다. 장애 재현 → 복구 → 재발 방지 순서로 짧게 기록하세요.',
                               tips=["의도적으로 DB를 끊고 응답·로그를 캡처한 실험 1건", "재시도·타임아웃 설정의 근거 한 줄"],
                               linked_item_ids=["error-handling", "incident-recovery"]),
        ],
        intro_orders=intro_orders,
    )
    essay = [
        EssayCard(kind="deviation", title='정합성을 "고민한 과정"으로 쓰기',
                  body="핀테크 자소서에서 기술 나열보다 강한 것은 돈이 걸린 데이터를 대하는 태도입니다. 재고·포인트처럼 어긋나면 안 되는 값을 다룬 경험을 과정 중심으로 쓰세요.",
                  narrative=Narrative(problem="동시 요청으로 재고가 음수가 되는 버그 발견",
                                      solve="원인 분석 → 격리수준·락 학습 → 적용·검증",
                                      growth='"정확성은 기능이 아니라 신뢰"라는 관점'),
                  sample_sentence='"버그를 고치는 것보다, 같은 버그가 다시 생길 수 없는 구조를 만드는 것이 백엔드의 일이라고 배웠습니다."',
                  linked_item_ids=["incident-recovery"]),
        EssayCard(kind="narrative_polish", title="협업 문제 해결 경험 — 보유 소재 다듬기",
                  body='이미 보유한 소재입니다. 핀테크 지원 시에는 "꼼꼼함·신중함" 각도로, 스타트업 지원 시에는 "속도·주도성" 각도로 같은 경험의 강조점을 바꾸세요.',
                  tips=["사실 관계는 고정, 배움의 방점만 조정", '결과 수치가 있다면 한 문장으로: "리뷰 반영 시간 30% 단축"'],
                  linked_item_ids=["collab-story"]),
    ]
    interview = [
        InterviewCard(kicker="편차 ① 직격", question="트랜잭션 격리 수준을 왜 그렇게 선택했나요?",
                      followups=["그 수준에서 생길 수 있는 문제(팬텀 리드 등)는 어떻게 막았나요?", "같은 요청이 두 번 오면(중복 결제) 어떻게 되나요?"],
                      point='정답 암기가 아니라 "내 프로젝트에서 왜 이 선택이었는지"로 답하면 꼬리질문이 두렵지 않습니다. 멱등성 처리까지 이어지면 편차 ①을 정면으로 채웁니다.',
                      linked_item_ids=["tx-integrity"]),
        InterviewCard(kicker="실패 대응", question="배치 작업이 중간에 실패하면 어떻게 복구하나요?",
                      followups=["이미 처리된 건과 안 된 건을 어떻게 구분하나요?", "재실행했을 때 두 번 처리되지 않는다는 보장은요?"],
                      point='장애 복구 실험 기록(포트폴리오 강조점 2)이 있으면 이 질문 전체가 "제가 해봤는데요"로 시작할 수 있습니다.',
                      linked_item_ids=["incident-recovery"]),
        InterviewCard(kicker="기본기 검증", question="인덱스를 어떤 기준으로 걸었나요?",
                      followups=["그 인덱스 때문에 느려지는 작업은 없나요?"],
                      point='baseline 항목은 깊이보다 근거를 봅니다. "조회 패턴을 보고 걸었다"는 한 문장이 필요합니다.',
                      linked_item_ids=["rdb-schema"]),
        InterviewCard(kicker="태도 검증 · 자소서 연동", question="자소서에 쓴 협업 문제, 상대방은 어떻게 기억할까요?",
                      followups=["다시 그 상황이 오면 무엇을 다르게 하겠어요?"],
                      point="자소서 소재는 반드시 면접에서 재검증됩니다. 소재의 사실 관계를 스스로 꼬리질문해 보세요.",
                      linked_item_ids=["collab-story"]),
    ]
    return ConditionsResponse(
        job=req.job, scope=req.scope,
        checklist=checklist, portfolio=portfolio, essay=essay, interview=interview,
        agent_version="0.1.0", source="fixture",
    )


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


@app.post("/roadmap", response_model=RoadmapResponse)
def roadmap(req: RoadmapRequest):
    # [뼈대] 고정 응답. req.conditions·req.checks는 아직 읽지 않는다 —
    # 실제 구현에서 미보유 항목 필터링·우선순위(rule)와 추천 문구(LLM)의 입력이 된다.
    project_steps = [
        ProjectStep(n=1, phase="STEP 01 · 3주", weeks=3, priority="vhigh",
                    title="기존 CRUD 프로젝트에 트랜잭션·동시성 시나리오 넣기",
                    body='이미 보유한 CRUD 프로젝트에 "동시 주문 시 재고가 음수가 되지 않게 막기" 시나리오를 추가하세요. 새 프로젝트를 시작하지 않고 기존 결과물을 심화하는 것이 기간 대비 효과가 가장 큽니다.',
                    deliverable="격리수준·락 선택의 근거 문서 + 동시 요청 테스트 코드 + README 1절 갱신",
                    fills=[Fill(item_id="tx-integrity", label="트랜잭션·동시성 심화 (편차 ①)", kind="dev"),
                           Fill(item_id="rdb-schema", label="RDB 설계·쿼리 기본기", kind="normal")],
                    reason_title="왜 첫 번째인가요?",
                    reason="핀테크·금융 기준 필수 미보유 중 편차 ①이 이 기업군의 최대 변별점입니다(같은 직군 27%, 신뢰도 높음). 면접 예상 질문 1·2가 모두 이 단계에서 준비됩니다.",
                    tags=["격리수준", "멱등성", "동시성 테스트"]),
        ProjectStep(n=2, phase="STEP 02 · 2주", weeks=2, priority="vhigh",
                    title="실패를 다루기 — 에러 응답 설계와 장애 복구 실험",
                    body="요청 검증·에러 응답을 정리하고, 의도적으로 DB를 끊어 장애를 재현한 뒤 복구 과정을 기록하세요. 정산 배치가 실패하면 어떻게 되는가에 대한 나만의 답이 생깁니다.",
                    deliverable="실패 케이스 처리 코드 + 장애 재현·복구 실험 기록 1건 + 회고 글",
                    fills=[Fill(item_id="error-handling", label="예외·에러 응답 설계", kind="normal"),
                           Fill(item_id="incident-recovery", label="장애·정합성 대응 경험 (편차 ②)", kind="dev")],
                    reason_title="왜 두 번째인가요?",
                    reason='STEP 01의 트랜잭션 시나리오가 있어야 "실패 시 정합성"을 실험할 대상이 생깁니다. 자소서 소재 1(정합성 서사)의 재료도 이 단계에서 나옵니다.',
                    tags=["에러 응답 설계", "장애 재현", "회고 작성"]),
        ProjectStep(n=3, phase="STEP 03 · 2주", weeks=2, priority="high",
                    title="부하를 측정하고 하나를 개선하기",
                    body='부하 테스트 도구로 병목 지점을 찾고, 인덱스 튜닝이나 캐시 중 하나를 골라 개선 전후 지표를 남기세요. "대용량"을 경험은 못 해도 측정과 시도는 보여줄 수 있습니다.',
                    deliverable="부하 테스트 결과 + 개선 전후 지표 비교 문서",
                    fills=[Fill(item_id="high-volume", label="대용량 처리 이해 (편차 ③)", kind="dev")],
                    reason_title="왜 세 번째인가요?",
                    reason="편차 ③은 신입에게 이해·시도 수준을 기대하는 항목이라, 필수 두 개를 채운 뒤가 적기입니다. 개선 전후 지표는 면접에서 가장 설득력 있는 근거입니다.",
                    tags=["부하 테스트", "인덱스 튜닝", "Redis 캐시"]),
        ProjectStep(n=4, phase="STEP 04 · 2주", weeks=2, priority="mid",
                    title="우대 채우기 + 지원 기업군에 맞춰 소개 다듬기",
                    body="여유가 있으면 JWT 인증(보안 우대)을 추가하고, 완성된 결과물의 README·자소서 소개 순서를 목표 기업군에 맞춰 재구성하세요. 핀테크는 정합성·보안이 먼저입니다.",
                    deliverable="JWT 인증 구현(선택) + 기업군 맞춤 README·자소서 소개 순서",
                    fills=[Fill(item_id="security", label="보안 기본 이해 (우대)", kind="normal")],
                    reason_title="왜 마지막인가요?",
                    reason="우대 항목과 소개 정리는 필수가 채워진 뒤의 마무리입니다. 합격 전략의 포트폴리오 전략(기업군별 소개 순서)이 이 단계의 지침입니다.",
                    tags=["JWT 인증", "README 재구성", "소개 순서"]),
    ]
    study_tracks = [
        StudyTrack(phase="STEP 01~02와 병행", priority="vhigh", title="트랜잭션·DB 이론",
                   depth="격리수준 4단계와 각각의 문제(더티 리드~팬텀 리드), 락과 MVCC의 차이, 인덱스가 쿼리를 빠르게 하는 원리를 남에게 설명할 수 있는 수준까지.",
                   reason_title="왜 필요한가요?",
                   reason='프로젝트 STEP 01에서 "적용"은 하지만, 면접 꼬리질문("그 수준에서 생기는 문제는요?")은 이론 이해를 검증합니다. 편차 ①의 면접 대비가 여기서 완성됩니다.',
                   fills=[Fill(item_id="tx-theory", label="트랜잭션·DB 이론 (학습)", kind="study")]),
        StudyTrack(phase="STEP 01~03과 병행", priority="high", title="Spring 동작 원리",
                   depth="DI 컨테이너가 하는 일, @Transactional이 실제로 어떻게 동작하는지(프록시), 요청 하나가 컨트롤러까지 오는 흐름을 그림으로 그릴 수 있는 수준까지.",
                   reason_title="왜 필요한가요?",
                   reason='"Spring을 써봤다"와 "Spring이 뭘 해주는지 안다"를 면접이 구분합니다. 프레임워크 이해 깊이는 신입 면접의 단골 검증 지점입니다.',
                   fills=[Fill(item_id="spring-internals", label="Spring 동작 원리 (학습)", kind="study")]),
        StudyTrack(phase="상시 · 주 3~4시간", priority="high", title="CS 기본기 — 네트워크·운영체제",
                   depth="HTTP/TCP의 기본 흐름, 프로세스와 스레드, 동시성 문제의 원인(경쟁 상태)까지. 과목 전체가 아니라 백엔드 면접 단골 주제 중심으로.",
                   reason_title="왜 필요한가요?",
                   reason="동시성(편차 ①)과 장애(편차 ②)의 이론적 바탕입니다. 특정 단계가 아니라 전 기간에 얇게 깔리는 것이 효율적입니다.",
                   fills=[Fill(item_id="cs-basics", label="CS 기본기 (학습)", kind="study")]),
        StudyTrack(phase="상시 · 별도 트랙", priority="track", title="알고리즘·코딩테스트",
                   depth="지원 시점까지 꾸준히. 이 로드맵의 항목이 아니라 채용 전형 자체의 관문이라 별도 트랙으로 둡니다.",
                   reason_title="왜 따로 두나요?",
                   reason="공고 요구 분석의 대상이 아니라 전형 단계입니다. 잊지 않도록 표시만 합니다.",
                   fills=[]),
    ]
    check_rows = [
        CheckRow(item_id="tx-integrity", title="트랜잭션·동시성 심화", kind="project", is_deviation=True, dev_n=1, source_step="STEP 01"),
        CheckRow(item_id="rdb-schema", title="RDB 설계·쿼리 기본기", kind="project", source_step="STEP 01"),
        CheckRow(item_id="error-handling", title="예외·에러 응답 설계", kind="project", source_step="STEP 02"),
        CheckRow(item_id="incident-recovery", title="장애·정합성 대응 경험", kind="story", is_deviation=True, dev_n=2, source_step="STEP 02"),
        CheckRow(item_id="high-volume", title="대용량 처리 이해", kind="project", is_deviation=True, dev_n=3, source_step="STEP 03"),
        CheckRow(item_id="security", title="보안 기본 이해", kind="project", required=False, source_step="STEP 04"),
        CheckRow(item_id="tx-theory", title="트랜잭션·DB 이론", kind="study", source_step="병행"),
        CheckRow(item_id="spring-internals", title="Spring 동작 원리", kind="study", source_step="병행"),
        CheckRow(item_id="cs-basics", title="CS 기본기", kind="study", source_step="상시"),
        CheckRow(item_id="crud-api", title="CRUD REST API 프로젝트", kind="project", source_step="보유"),
        CheckRow(item_id="collab-story", title="협업 문제 해결 서사", kind="story", source_step="보유"),
    ]
    return RoadmapResponse(
        job=req.job, scope=req.scope,
        project_steps=project_steps, study_tracks=study_tracks, check_rows=check_rows,
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
