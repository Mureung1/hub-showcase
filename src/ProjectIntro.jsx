import './ProjectIntro.css'

function ProjectIntro() {
  return (
    <main className="intro">
      <header className="intro-header">
        <p className="intro-eyebrow">AI Agent Challenge</p>
        <h1>대학생 투자자를 위한 리서치 검증 Agent</h1>
        <p className="intro-tagline">
          종목을 추천하지 않습니다. 이미 내린 매수 판단이 실제 데이터로
          뒷받침되는지 검증합니다.
        </p>
      </header>

      <section className="intro-problem">
        <h2>왜 필요한가</h2>
        <p>
          대학생 소액 투자자는 재무제표를 읽을 줄 모르고, 매수 근거가 대부분
          &lsquo;감&rsquo;이거나 커뮤니티에서 들은 얘기입니다. 문제는 정보
          부족이 아니라, <strong>판단 근거를 검증할 수단이 없다는 것</strong>
          입니다.
        </p>
      </section>

      <section className="intro-features">
        <h2>핵심 기능</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>종목 공부 Agent</h3>
            <p>
              종목명을 입력하면 공시와 재무제표를 조회해 초보자용 요약
              리포트를 만들어줍니다.
            </p>
          </div>
          <div className="feature-card">
            <h3>근거 검증 Agent</h3>
            <p>
              &ldquo;실적이 좋아질 것 같아서 샀다&rdquo; 같은 매수 이유를
              입력하면, 실제 공시·재무 데이터와 대조해 근거가 충분한지
              판정합니다.
            </p>
          </div>
        </div>
      </section>

      <footer className="intro-footer">
        <p>OpenDART 공시 데이터 × LangGraph Agent × 근거 검증 파이프라인</p>
      </footer>
    </main>
  )
}

export default ProjectIntro
