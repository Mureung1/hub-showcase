import { Link } from 'react-router-dom'
import { GrowthIcon, LogoMark, NetworkIcon, TrophyIcon } from './icons.jsx'
import './Landing.css'

// 랜딩 내용은 FirstPR-Landing/index.html 을 따르고, 스타일은 design.md 토큰 기반
const WHY_CONTRIBUTE = [
  {
    icon: <GrowthIcon />,
    title: '실무 코드 경험',
    description: '실제 서비스 코드베이스를 읽고 고치며, 강의에서는 배울 수 없는 실전 감각을 키워요.',
  },
  {
    icon: <NetworkIcon />,
    title: '글로벌 네트워킹',
    description: '전 세계 메인테이너·개발자와 함께 협업하며 시야를 넓힐 수 있어요.',
  },
  {
    icon: <TrophyIcon />,
    title: '증명되는 포트폴리오',
    description: '이력서 한 줄보다 강력한, 실제로 머지된 PR 기록이 남아요.',
  },
]

const FEATURES = [
  {
    icon: '🔍',
    title: 'GitHub 프로필 분석',
    description:
      '사용 언어, 커밋·PR 이력, 오픈소스 참여 경험을 분석해 기술 성향과 실력 수준을 파악해요.',
  },
  {
    icon: '🎯',
    title: '맞춤 레포·이슈 추천',
    description:
      '선호하는 언어·난이도·주제를 조합해 지금 시작하기 딱 좋은 레포와 이슈를 골라드려요.',
  },
  {
    icon: '📄',
    title: '추천 상세 보기',
    description:
      '난이도, 필요 기술, 이슈 링크까지. 바로 GitHub으로 이동해 첫 기여를 시작할 수 있어요.',
  },
]

const STEPS = [
  { num: 1, title: 'GitHub ID 입력', description: '내 GitHub 계정만 연결하면 준비 끝' },
  { num: 2, title: '선호 조건 선택', description: '언어·난이도·주제를 골라요' },
  { num: 3, title: 'AI 분석', description: '활동 이력과 조건을 함께 분석' },
  { num: 4, title: '추천 받기', description: '맞춤 레포·이슈로 첫 기여 시작' },
]

const RECOMMEND_PREVIEW = [
  { icon: '📦', name: 'vitejs / vite', meta: 'docs 오타 수정 이슈', tag: '쉬움', easy: true },
  { icon: '⚡', name: 'facebook / react', meta: 'good first issue · 타입 개선', tag: '추천', easy: false },
  { icon: '🐍', name: 'psf / requests', meta: '테스트 커버리지 추가', tag: '쉬움', easy: true },
]

function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-container landing-nav">
          <div className="landing-logo">
            <span className="landing-logo-mark">
              <LogoMark />
            </span>
            FirstPR
          </div>
          <Link to="/input" className="landing-nav-cta">
            시작하기
          </Link>
        </div>
      </header>

      <main className="landing-container">
        {/* 히어로 */}
        <section className="landing-hero">
          <span className="landing-badge">🚀 첫 오픈소스 기여, 이제 막막하지 않게</span>
          <h1 className="landing-hero-title">
            나에게 딱 맞는
            <br />
            <span className="landing-accent">첫 오픈소스 기여</span>를 찾아드려요
          </h1>
          <p className="landing-hero-sub">
            GitHub 활동을 분석해 내 기술 스택과 실력 수준에 맞는 레포지토리와 이슈를 추천해드려요.
            부담 없이 첫 PR을 시작하세요.
          </p>
          <div className="landing-hero-actions">
            <Link to="/input" className="landing-btn-primary">
              GitHub으로 시작하기
            </Link>
            {/* HashRouter라 #앵커 href는 라우트 변경으로 해석됨 → 스크롤 함수로 이동 */}
            <button
              type="button"
              className="landing-btn-secondary"
              onClick={() => document.getElementById('why')?.scrollIntoView({ behavior: 'smooth' })}
            >
              왜 기여해야 할까요?
            </button>
          </div>

          {/* 추천 미리보기 목업 카드 */}
          <div className="landing-mock">
            <div className="landing-mock-head">
              <div className="landing-mock-avatar">O</div>
              <div>
                <div className="landing-mock-name">@octocat 님을 위한 추천</div>
                <div className="landing-mock-sub">JavaScript · Python · 주니어</div>
              </div>
            </div>
            {RECOMMEND_PREVIEW.map((item) => (
              <div className="landing-repo-item" key={item.name}>
                <div className="landing-repo-icon">{item.icon}</div>
                <div>
                  <div className="landing-repo-name">{item.name}</div>
                  <div className="landing-repo-meta">{item.meta}</div>
                </div>
                <span className={item.easy ? 'landing-tag landing-tag-easy' : 'landing-tag'}>
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 문제 정의 */}
        <section>
          <div className="landing-problem">
            <p className="landing-quote">
              “오픈소스에 기여해보고 싶은데,
              <br />
              <span className="landing-muted">
                어떤 프로젝트의 어떤 이슈부터 시작해야 할지 모르겠어요.”
              </span>
            </p>
          </div>
        </section>

        {/* 왜 기여해야 하나 */}
        <section id="why">
          <div className="landing-section-head">
            <div className="landing-eyebrow">WHY OPEN SOURCE</div>
            <h2>왜 오픈소스에 기여해야 할까요?</h2>
            <p>첫 PR이 남기는 것들</p>
          </div>
          <div className="landing-grid">
            {WHY_CONTRIBUTE.map((item) => (
              <div className="landing-card" key={item.title}>
                <div className="landing-card-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 핵심 기능 */}
        <section>
          <div className="landing-section-head">
            <div className="landing-eyebrow">CORE FEATURES</div>
            <h2>FirstPR이 도와드릴게요</h2>
            <p>분석부터 추천, 상세 정보까지 한 번에</p>
          </div>
          <div className="landing-grid">
            {FEATURES.map((feature) => (
              <div className="landing-card" key={feature.title}>
                <div className="landing-card-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 이용 흐름 */}
        <section id="how">
          <div className="landing-section-head">
            <div className="landing-eyebrow">HOW IT WORKS</div>
            <h2>4단계면 충분해요</h2>
          </div>
          <div className="landing-steps">
            {STEPS.map((step) => (
              <div className="landing-step" key={step.num}>
                <div className="landing-step-num">{step.num}</div>
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="landing-cta">
            <h2>첫 PR, 오늘 시작해볼까요?</h2>
            <p>GitHub ID만 있으면 1분 안에 추천을 받아볼 수 있어요.</p>
            <Link to="/input" className="landing-btn-white">
              GitHub으로 시작하기
            </Link>
            <div className="landing-cta-note">
              공개된 GitHub 활동 정보만 사용하며, 별도 개인정보는 수집하지 않아요.
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-logo">
            <span className="landing-logo-mark">
              <LogoMark />
            </span>
            FirstPR
          </div>
          <div>© 2026 FirstPR. 오픈소스 첫 기여를 위한 추천 서비스.</div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
