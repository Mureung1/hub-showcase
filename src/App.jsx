import "./App.css";

function ProjectIntro() {
  return (
    <section className="project-card">
      <p className="tag">Mini Mission</p>

      <h1>대학생 일정 관리 서비스</h1>

      <p className="description">
        과제, 시험, 팀플 일정을 한눈에 정리하고 마감일 기준으로
        우선순위를 확인할 수 있는 React 기반 서비스입니다.
      </p>

      <div className="feature-box">
        <h2>주요 기능</h2>
        <ul>
          <li>과제와 시험 일정 등록</li>
          <li>마감일 기준 우선순위 확인</li>
          <li>오늘 해야 할 일 요약</li>
        </ul>
      </div>
    </section>
  );
}

function App() {
  return <ProjectIntro />;
}

export default App;