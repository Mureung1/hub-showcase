import { Link, Navigate } from 'react-router-dom'
import { useSession } from '../lib/useSession.js'
import { APP_HOME } from '../lib/routes.js'
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

/**
 * 인증 인지형 홈(`/`):
 * - 세션 로딩 중  → 스피너
 * - 로그인됨      → 앱 진입점(APP_HOME)으로 리다이렉트 (매일 쓰는 사용자는 랜딩 건너뜀)
 * - 로그아웃      → 마케팅 랜딩 (첫 방문자·심사자에게 가치 설명 + 로그인 유도)
 */
export default function LandingPage() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="route-loading">
        <p>불러오는 중...</p>
      </div>
    )
  }

  if (session) {
    return <Navigate to={APP_HOME} replace />
  }

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
        <p className="landing-disclaimer">
          Beacon은 회원님의 매매 기록을 돌아보기 위한 저널링·복기 도구이며, 투자자문·매매 권유
          서비스가 아닙니다. 모든 투자 판단과 책임은 회원님 본인에게 있습니다.
        </p>
        Beacon · Naver AI Agent Challenge
      </footer>
    </div>
  )
}
