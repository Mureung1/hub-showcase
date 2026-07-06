import "./App.css";

function App() {
  return (
    <main className="page">
      <section className="hero-card">
        <p className="badge">AI Agent Challenge</p>

        <h1>🎓 Campus AI Planner</h1>
        <h2>대학생을 위한 AI 일정 관리 서비스</h2>

        <p className="intro">
          과제, 공모전, 장학금, 학교 일정을 한곳에서 정리하고
          <br />
          AI가 중요한 마감일을 놓치지 않도록 도와주는 서비스입니다.
        </p>

        <div className="features">
          <article>
            <span>📌</span>
            <h3>과제 관리</h3>
            <p>마감일과 진행 상태를 한눈에 확인합니다.</p>
          </article>

          <article>
            <span>🏆</span>
            <h3>공모전 정리</h3>
            <p>관심 있는 공모전 정보를 저장합니다.</p>
          </article>

          <article>
            <span>🎓</span>
            <h3>장학금 알림</h3>
            <p>신청 기간을 놓치지 않도록 관리합니다.</p>
          </article>

          <article>
            <span>🤖</span>
            <h3>AI 일정 추천</h3>
            <p>우선순위에 맞게 일정을 추천합니다.</p>
          </article>
        </div>

        <button>일정 관리 시작하기</button>
      </section>
    </main>
  );
}

export default App;