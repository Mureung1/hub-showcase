import './App.css'

function ProjectIntro() {
  const problems = [
    '팀원별 역할과 담당 업무가 명확하게 정리되지 않는 문제',
    '할 일, 진행 상태, 회의 내용이 여러 곳에 흩어지는 문제',
    '자료 링크와 산출물을 다시 찾기 어려운 문제',
    '현재 프로젝트가 어디까지 진행됐는지 한눈에 보기 어려운 문제',
  ]

  const features = [
    {
      number: '01',
      title: '역할 기반 할 일 관리',
      description:
        '팀원별 역할을 정리하고, 각 할 일에 담당자와 상태를 연결해 누가 무엇을 하고 있는지 명확하게 관리합니다.',
    },
    {
      number: '02',
      title: '진행도 대시보드',
      description:
        '전체 할 일, 완료된 작업, 진행 중인 작업을 한눈에 보여주어 팀플의 현재 상황을 빠르게 파악할 수 있습니다.',
    },
    {
      number: '03',
      title: '회의록·자료 관리',
      description:
        '회의에서 정한 내용, 참고자료, 발표자료, 제출 링크를 프로젝트 안에 모아 필요한 정보를 쉽게 찾을 수 있게 합니다.',
    },
  ]

  const flows = [
    '프로젝트 생성',
    '팀원·역할 등록',
    '할 일 배정',
    '회의록 작성',
    '자료 저장',
    '진행도 확인',
  ]

  return (
    <main className="app">
      <section className="project-card">
        <div className="hero">
          <p className="tag">Bootcamp Project</p>

          <h1>
            팀플 정보를 한 곳에, <br />
            진행 상황은 한눈에
          </h1>

          <p className="description">
            대학생 팀플에서는 역할 분담, 할 일, 회의록, 자료 링크가 카카오톡,
            노션, 구글 드라이브처럼 여러 곳에 흩어지는 경우가 많습니다.
            이 서비스는 팀플 프로젝트에 필요한 정보를 하나의 작업 공간에서
            관리하고, 팀 전체의 진행 상황을 쉽게 확인할 수 있도록 돕는
            웹서비스입니다.
          </p>

          <div className="hero-actions">
            <a href="#features" className="primary-button">
              핵심 기능 보기
            </a>
            <a href="#problem" className="secondary-button">
              문제 정의 보기
            </a>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span>주제</span>
            <strong>대학생 팀플 관리 웹서비스</strong>
          </div>
          <div className="summary-card">
            <span>핵심</span>
            <strong>역할 · 할 일 · 진행도 · 자료 관리</strong>
          </div>
          <div className="summary-card">
            <span>확장</span>
            <strong>AI 팀원 기능 고려</strong>
          </div>
        </div>

        <section id="problem" className="content-box">
          <div>
            <p className="section-label">Problem</p>
            <h2>해결하고 싶은 문제</h2>
          </div>

          <ul className="problem-list">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </section>

        <section className="content-box">
          <div>
            <p className="section-label">Scenario</p>
            <h2>사용자 흐름</h2>
          </div>

          <div className="flow-list">
            {flows.map((flow, index) => (
              <div className="flow-item" key={flow}>
                <span>{index + 1}</span>
                <p>{flow}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="features">
          {features.map((feature) => (
            <div className="feature" key={feature.number}>
              <span className="feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="ai-note">
          <p className="section-label">Extension</p>
          <h2>AI 팀원 확장 기능</h2>
          <p>
            기본 목표는 팀플 관리 웹서비스를 완성하는 것입니다. 이후 확장 기능으로
            사람 팀원뿐만 아니라 AI 팀원을 추가해 자료조사, 회의록 정리, 기획
            피드백 같은 역할을 맡길 수 있는 구조를 고려합니다.
          </p>
        </section>
      </section>
    </main>
  )
}

function App() {
  return <ProjectIntro />
}

export default App