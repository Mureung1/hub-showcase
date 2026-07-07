import './App.css';

function App() {
  return (
    <main className="app">
      <header className="header">
        <span className="logo">FitCheck</span>
        <span className="badge">Trainer</span>
      </header>
      <section className="hero">
        <h1>트레이너 웹 대시보드</h1>
        <p>회원 관리, 운동 프로그램, 피드백을 한곳에서 관리하세요.</p>
      </section>
      <section className="dashboard">
        <div className="signal-dashboard">
          <h2>신호등 소통 대시보드</h2>
          <p>관리 공백이 발생한 회원을 실시간(빨강/노랑)으로 포착 및 푸시 알림 전송</p>
        </div>
        <div className="automation-dashboard">
          <h2>초간편 자동화 루틴 입력</h2>
          <p>지난 세션 복사 및 점진적 과부하 매크로 버튼을 통한 초고속 가이드 전송</p>
        </div>
        <div className="nutrition-dashboard">
          <h2>식단 피드백 타임라인</h2>
          <p>회원이 업로드한 일별 식단을 한눈에 모아보고 즉각적인 피드백 수행</p>
        </div>
      </section>
    </main>
  );
}

export default App;
