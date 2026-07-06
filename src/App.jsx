const opportunityTypes = ["장학금", "공모전", "대외활동", "인턴십", "교육 프로그램"];

const workflow = [
  {
    label: "탐색",
    title: "여러 출처의 기회를 한 번에 수집",
    copy: "학교 공지, 기관 페이지, 공모전 플랫폼에 흩어진 정보를 주제와 마감일 기준으로 모읍니다.",
  },
  {
    label: "분류",
    title: "나에게 맞는 조건만 정리",
    copy: "지원 자격, 분야, 지역, 일정, 혜택을 비교해서 우선순위를 자동으로 잡습니다.",
  },
  {
    label: "요약",
    title: "지원에 필요한 핵심만 제공",
    copy: "마감일, 제출 서류, 신청 링크, 준비 체크리스트를 보기 쉬운 형태로 요약합니다.",
  },
];

const highlights = [
  "마감 임박 일정 알림",
  "관심 분야별 자동 태깅",
  "지원 조건 비교",
  "개인별 추천 목록",
];

export default function OpportunityAgentIntro() {
  return (
    <main className="intro-page">
      <section className="hero-section" aria-labelledby="project-title">
        <div className="hero-copy">
          <p className="eyebrow">AI Agent Project</p>
          <h1 id="project-title">Opportunity Agent</h1>
          <p className="lead">
            장학금, 공모전, 대외활동 정보를 검색하고 정리해 지원자가 놓치기 쉬운 기회를
            빠르게 발견하도록 돕는 에이전트입니다.
          </p>

          <div className="category-list" aria-label="검색 대상">
            {opportunityTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>

          <div className="summary-strip" aria-label="프로젝트 핵심 지표">
            <div>
              <strong>5+</strong>
              <span>기회 유형</span>
            </div>
            <div>
              <strong>3단계</strong>
              <span>검색 흐름</span>
            </div>
            <div>
              <strong>1곳</strong>
              <span>정리된 대시보드</span>
            </div>
          </div>
        </div>

        <div className="agent-board" aria-label="에이전트 검색 결과 예시">
          <div className="board-topbar">
            <span className="status-dot" />
            <span>실시간 기회 정리</span>
          </div>

          <div className="search-preview">
            <span>관심 키워드</span>
            <strong>AI, 데이터, 대학생, 서울</strong>
          </div>

          <div className="match-card">
            <p className="match-label">추천 1순위</p>
            <h2>청년 데이터 분석 장학 프로그램</h2>
            <p>지원 자격과 관심 분야가 높게 일치합니다.</p>
            <div className="match-meta">
              <span>마감 D-9</span>
              <span>서류 2종</span>
              <span>장학금</span>
            </div>
          </div>

          <ul className="insight-list">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="workflow-section" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="eyebrow">How It Works</p>
          <h2 id="workflow-title">흩어진 기회를 지원 가능한 목록으로 바꿉니다</h2>
        </div>

        <div className="workflow-grid">
          {workflow.map((step) => (
            <article key={step.label} className="workflow-card">
              <span>{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
