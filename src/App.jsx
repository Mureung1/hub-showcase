const featureCards = [
  {
    title: "학점 자동 계산",
    description:
      "총 이수 학점, 전공 학점, 교양 학점, 창업교과목과 현장실습 인정 학점까지 한 화면에서 확인합니다.",
  },
  {
    title: "수강 과목 바구니",
    description:
      "앞으로 들을 과목을 담아보며 남은 학기별 수강 계획을 직관적으로 구성합니다.",
  },
  {
    title: "AI 기반 수강 계획 추천",
    description:
      "부족한 학점 영역을 분석하고 졸업 요건을 채우기 위한 과목 조합을 제안합니다.",
  },
];

const dashboardItems = [
  { label: "총 학점", value: "112", helper: "140학점 중" },
  { label: "전공 학점", value: "48", helper: "60학점 필요" },
  { label: "교양 학점", value: "34", helper: "36학점 필요" },
  { label: "세부 학점", value: "11", helper: "창업/현장실습/해외대학" },
];

const courseExamples = [
  { title: "캡스톤디자인", category: "전공선택", credit: "3학점" },
  { title: "AI 서비스 기획", category: "전공심화", credit: "3학점" },
  { title: "창업과 진로설계", category: "교양/창업", credit: "2학점" },
];

function App() {
  return (
    <main className="app">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Graduation Planner AI</p>
          <h1>졸업 플래너 AI</h1>
          <p className="hero-description">
            졸업 요건, 수강 계획, AI 추천을 한 화면에서 확인할 수 있는 서비스입니다.
            이수한 학점과 수강 예정 과목을 바탕으로 남은 졸업 계획을 더 쉽게 세울 수
            있도록 돕습니다.
          </p>
        </div>

        <div className="hero-summary" aria-label="졸업 요건 요약">
          <span>졸업 요건 충족까지</span>
          <strong>28학점 남음</strong>
          <div className="progress-bar">
            <div className="progress-value" />
          </div>
          <p>전공, 교양, 세부 인정 학점을 함께 점검하는 대시보드 미리보기입니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Core Features</p>
          <h2>핵심 기능</h2>
        </div>
        <div className="feature-grid">
          {featureCards.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section dashboard-preview">
        <div className="section-heading">
          <p className="eyebrow">Dashboard Preview</p>
          <h2>학점 현황 미리보기</h2>
        </div>
        <div className="dashboard-grid">
          {dashboardItems.map((item) => (
            <article className="dashboard-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.helper}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section course-section">
        <div className="section-heading">
          <p className="eyebrow">Course Basket</p>
          <h2>과목 선택 예시</h2>
        </div>
        <div className="course-layout">
          <div className="course-list">
            {courseExamples.map((course) => (
              <article className="course-card" key={course.title}>
                <div>
                  <h3>{course.title}</h3>
                  <p>{course.category}</p>
                </div>
                <span>{course.credit}</span>
              </article>
            ))}
          </div>

          <aside className="basket-preview" aria-label="수강 과목 바구니">
            <p>수강 과목 바구니</p>
            <strong>8학점 담김</strong>
            <span>선택한 과목들이 졸업 계획에 반영되는 모습을 표현한 예시입니다.</span>
          </aside>
        </div>
      </section>

      <section className="ai-recommendation">
        <div>
          <p className="eyebrow">AI Recommendation</p>
          <h2>AI Agent가 부족한 영역을 분석합니다</h2>
          <p>
            실제 AI API 연동 없이, 졸업 계획을 바탕으로 어떤 과목을 수강하면 좋을지
            추천받는 흐름을 시각적으로 보여줍니다.
          </p>
        </div>
        <button type="button">4-1까지 졸업 요건을 채우는 계획을 추천받기</button>
      </section>
    </main>
  );
}

export default App;
