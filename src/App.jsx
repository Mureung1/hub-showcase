import './App.css'

function ProjectIntro() {
  return (
    <main className="app">
      <section className="project-card">
        <div className="hero">
          <p className="tag">Bootcamp Project Idea</p>

          <h1>
            팀플, 이제 <br />
            흩어지지 않게 관리하세요
          </h1>

          <p className="description">
            조별과제를 할 때 Notion 템플릿이나 메신저를 활용하는 경우가 많지만,
            역할 분담, 일정 관리, 자료 공유, 진행 상황 확인이 여러 곳에 흩어져
            관리가 어려운 경우가 많습니다. 이 서비스는 팀 프로젝트에 필요한 정보를
            한 화면에서 관리할 수 있도록 돕는 웹 서비스입니다.
          </p>
        </div>

        <div className="content-box">
          <div>
            <p className="section-label">Problem</p>
            <h2>해결하고 싶은 문제</h2>
          </div>

          <ul className="problem-list">
            <li>팀원별 역할과 담당 업무가 명확하게 정리되지 않는 문제</li>
            <li>마감일, 회의 일정, 제출 일정이 흩어져 관리되는 문제</li>
            <li>파일, 링크, 회의 내용, 참고 자료를 다시 찾기 어려운 문제</li>
            <li>현재 프로젝트가 어느 정도 진행됐는지 한눈에 보기 어려운 문제</li>
          </ul>
        </div>

        <div className="features">
          <div className="feature">
            <span className="feature-number">01</span>
            <h3>역할 분담</h3>
            <p>팀원별 담당 역할과 해야 할 일을 명확하게 정리합니다.</p>
          </div>

          <div className="feature">
            <span className="feature-number">02</span>
            <h3>일정 관리</h3>
            <p>회의, 과제 마감, 발표 준비 일정을 한 곳에서 확인합니다.</p>
          </div>

          <div className="feature">
            <span className="feature-number">03</span>
            <h3>자료 공유</h3>
            <p>파일, 링크, 회의록, 참고 자료를 프로젝트별로 모아둡니다.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

function App() {
  return <ProjectIntro />
}

export default App