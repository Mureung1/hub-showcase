import { Link } from 'react-router-dom'
import './LandingPage.css'

const LOOP = [
  {
    icon: '👀',
    title: '지켜본다',
    desc: '자연어로 조건을 걸면 KIS Open API로 시장을 감시해 Discord로 알림.',
  },
  {
    icon: '📥',
    title: '기록한다',
    desc: '알림의 매수/매도 버튼으로 원클릭 기록. 가격·시각 자동 저장.',
  },
  {
    icon: '🔁',
    title: '복기한다',
    desc: 'AI 코칭 에이전트가 과거 기록을 근거로 반복 실수를 짚어준다.',
  },
]

const EXAMPLES = [
  '삼성전자가 8만 원이 되면 알려줘',
  '엔비디아 5일선이 20일선 위로 올라오면 알려줘',
  '테슬라 170달러 밑으로 떨어지면 알려줘',
]

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-top">
        <span className="brand">🔦 Beacon</span>
        <Link to="/login" className="btn accent">
          시작하기
        </Link>
      </header>

      <section className="hero">
        <span className="pill">AI 투자 에이전트</span>
        <h1>
          말을 걸면 지켜보고,
          <br />
          <span className="accent-text">내 기록을 기억해</span> 코치한다
        </h1>
        <p className="hero-sub">
          자연어로 조건을 걸면 시장을 대신 감시해 알림하고, 그렇게 실행한 매매를
          AI 코칭 에이전트가 과거 기록을 근거로 복기해 반복 실수를 짚어줍니다.
        </p>
        <div className="hero-cta">
          <Link to="/login" className="btn accent">
            무료로 시작하기
          </Link>
          <Link to="/dashboard" className="btn">
            데모 둘러보기 →
          </Link>
        </div>
      </section>

      <section className="examples card">
        <div className="examples-label">이렇게 말하면 됩니다</div>
        <div className="examples-list">
          {EXAMPLES.map((e) => (
            <div key={e} className="example-chip mono">
              “{e}”
            </div>
          ))}
        </div>
      </section>

      <section className="loop">
        {LOOP.map((l, i) => (
          <div key={l.title} className="loop-card card">
            <div className="loop-step">STEP {i + 1}</div>
            <div className="loop-icon">{l.icon}</div>
            <h3>{l.title}</h3>
            <p>{l.desc}</p>
          </div>
        ))}
      </section>

      <footer className="landing-foot caption">
        Beacon · Naver AI Agent Challenge · 프로토타입 (목데이터, 비동작)
      </footer>
    </div>
  )
}
