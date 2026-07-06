import './ProjectIntro.css'

const COMPARISON = [
  {
    broadcast: '불특정 다수 대상 broadcast',
    personal: '내 종목·관심분야 기준 개인화 필터링',
  },
  {
    broadcast: '재미있는 요약이 목적',
    personal: '요약 + 실전 금융 영어 학습이 동시 목적',
  },
  {
    broadcast: '1회 소비형 콘텐츠',
    personal: '표현이 쌓이는 "학습 자산" 구조',
  },
]

const SCENARIOS = [
  {
    icon: '📈',
    title: '보유 종목 데일리 브리핑',
    desc: 'NVDA, TSLA 같은 보유 종목을 등록하면 매일 관련 기사를 한국어로 요약하고, 핵심 원문 문장과 표현(beat expectations, guidance 등)을 함께 제시',
  },
  {
    icon: '🏭',
    title: '관심 산업 트렌드 브리핑',
    desc: '"반도체", "AI 데이터센터" 같은 산업 단위로 등록하면 여러 기사를 종합해 오늘 그 산업에서 있었던 일을 정리',
  },
  {
    icon: '📚',
    title: '반복 표현 누적 학습',
    desc: 'headwinds, sell-off 등 뉴스에 반복 등장하는 표현을 자동으로 모아 "나만의 금융 영어 단어장"으로 저장 후 주기적 복습',
  },
  {
    icon: '🖱️',
    title: '용어 클릭 학습',
    desc: '요약문·원문에서 모르는 표현을 클릭하면 즉시 뜻과 다른 뉴스 예문을 보여줘 사전 이탈 없이 학습',
  },
]

function ProjectIntro() {
  return (
    <div className="pi-page">
      <div className="pi-container">
        <header className="pi-hero">
          <span className="pi-badge">MVP · Personal Investor Agent</span>
          <h1 className="pi-title">해외주식 뉴스 + 금융영어 학습 에이전트</h1>
          <p className="pi-tagline">
            "내가 투자한(또는 투자를 고려하는) 종목·산업의 해외 뉴스를 매일 확인하면서,
            동시에 실전 금융 영어를 습득하는 에이전트"
          </p>
        </header>

        <section className="pi-section">
          <h2 className="pi-section-title">기존 뉴스레터와 무엇이 다른가</h2>
          <div className="pi-compare">
            <div className="pi-compare-col pi-compare-old">
              <h3>순살브리핑 · Investing.com 등</h3>
              <ul>
                {COMPARISON.map((row) => (
                  <li key={row.broadcast}>{row.broadcast}</li>
                ))}
              </ul>
            </div>
            <div className="pi-compare-arrow">→</div>
            <div className="pi-compare-col pi-compare-new">
              <h3>이 프로젝트</h3>
              <ul>
                {COMPARISON.map((row) => (
                  <li key={row.personal}>{row.personal}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="pi-section">
          <h2 className="pi-section-title">핵심 사용자 시나리오</h2>
          <div className="pi-scenario-grid">
            {SCENARIOS.map((s) => (
              <div className="pi-scenario-card" key={s.title}>
                <div className="pi-scenario-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="pi-footer">
          <span className="pi-tech-label">Tech</span>
          {['React + Vite', 'Node.js + Express', 'SQLite', 'Google News RSS'].map((t) => (
            <span className="pi-tech-chip" key={t}>
              {t}
            </span>
          ))}
        </footer>
      </div>
    </div>
  )
}

export default ProjectIntro
