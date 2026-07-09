import './CareerResearchAgentIntro.css'

function CareerResearchAgentIntro() {
  return (
    <main className="intro-page">
      <section className="hero-section">
        <p className="eyebrow">AI Agent Project</p>
        <h1>채용공고 기반 대학생 진로탐색 리서치 에이전트</h1>
        <p className="hero-description">
          관심 직무의 채용공고를 분석해 현재 시장에서 요구하는 역량과 준비 방향을
          정리하고, 대학생의 진로 탐색을 구체적으로 돕는 서비스입니다.
        </p>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="section-label">Problem</p>
          <h2>진로 탐색에서 마주하는 어려움</h2>
        </div>
        <ul className="card-grid">
          <li className="info-card">
            실제 채용시장에서 어떤 기술과 경험을 요구하는지 파악하기 어렵습니다.
          </li>
          <li className="info-card">
            수많은 채용공고를 직접 찾아보고 비교하는 데 많은 시간이 듭니다.
          </li>
          <li className="info-card">
            요구 기술, 프로젝트 경험, 우대사항, 시장 흐름을 혼자 정리하기 어렵습니다.
          </li>
        </ul>
      </section>

      <section className="content-section highlight-section">
        <div className="section-heading">
          <p className="section-label">Service Idea</p>
          <h2>채용공고를 진로 준비 전략으로 바꿉니다</h2>
        </div>
        <p>
          사용자가 관심 직무를 입력하면 관련 채용공고를 분석해 주요 요구 역량,
          기술 스택, 프로젝트 경험, 우대사항을 정리합니다. 이후 사용자의 현재
          기술과 경험을 비교해 부족한 역량을 찾고, 학습 방향과 프로젝트 방향을
          제안합니다.
        </p>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="section-label">Workflow</p>
          <h2>서비스 흐름</h2>
        </div>
        <ol className="workflow-list">
          <li>관심 직무 입력</li>
          <li>관련 채용공고 분석</li>
          <li>요구 역량과 시장 흐름 추출</li>
          <li>사용자의 현재 경험과 비교</li>
          <li>학습, 프로젝트, 진로 준비 전략 제안</li>
        </ol>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <p className="section-label">Value</p>
          <h2>기대 효과</h2>
        </div>
        <div className="value-grid">
          <div>
            <strong>시간 절약</strong>
            <p>채용공고 탐색과 비교 과정을 빠르게 정리합니다.</p>
          </div>
          <div>
            <strong>현실적인 기준</strong>
            <p>실제 채용시장의 요구를 기준으로 진로를 바라봅니다.</p>
          </div>
          <div>
            <strong>구체적인 준비</strong>
            <p>학습 계획과 프로젝트 주제를 더 명확하게 선택하도록 돕습니다.</p>
          </div>
        </div>
      </section>

      <section className="scope-section">
        <p className="section-label">Today Scope</p>
        <h2>현재 구현 범위</h2>
        <p>
          이번 화면은 프로젝트 주제를 소개하는 정적 React 컴포넌트입니다. 실제
          AI Agent 기능, 입력창, API 호출, 백엔드 연동은 이후 프로토타입과 실제
          서비스 구현 단계에서 추가합니다.
        </p>
      </section>
    </main>
  )
}

export default CareerResearchAgentIntro
