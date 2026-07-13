import './Landing.css'

interface LandingProps {
  onStart: () => void
}

const problems = [
  {
    title: '홈택스, 정부24, 소상공인시장진흥공단',
    body: '필요한 정보가 여러 공식 사이트에 흩어져 있어요.',
  },
  {
    title: '업종마다 다른 절차',
    body: '직원·임대 여부에 따라 실제로 필요한 게 달라 헷갈려요.',
  },
  {
    title: '놓치기 쉬운 마감',
    body: '세무 신고 같은 기한을 놓치면 불이익으로 이어져요.',
  },
]

const features = [
  {
    title: '상황 진단 온보딩',
    body: '업종, 개인·법인 여부, 직원·임대 유무, 폐업 예정일 5문항으로 나만의 프로필을 만들어요.',
  },
  {
    title: '폐업 신고 절차 안내',
    body: '프로필에 맞는 신고 항목만 필터링해서 보여줘요. 해당 없는 절차는 아예 안 보여요.',
  },
  {
    title: '세무 신고 일정 안내',
    body: '부가세·종합소득세 신고 일정을 알려드리고, 정확한 금액은 홈택스 공식 링크로 안내해요.',
  },
  {
    title: '지원금 및 재기 지원',
    body: '희망리턴패키지 등 조건에 맞는 정부 지원사업을 근거와 함께 알려드려요.',
  },
]

const steps = [
  {
    label: 'STEP 01',
    title: '내 상황 알려주기',
    body: '업종·직원·임대 여부·폐업 예정일, 5가지만 입력하면 끝나요.',
  },
  {
    label: 'STEP 02',
    title: '맞춤 체크리스트 확인',
    body: '해당하는 절차·세무·지원금만 추려서, 마감이 가까운 순서로 보여줘요.',
  },
  {
    label: 'STEP 03',
    title: '체크하며 진행률 추적',
    body: '완료한 항목을 체크하면 전체 진행률이 한눈에 보여요.',
  },
]

function Landing({ onStart }: LandingProps) {
  return (
    <main className="landing">
      <header className="landing__nav">
        <span className="landing__brand">소상공인 폐업 도우미</span>
        <nav className="landing__nav-links">
          <a href="#features">기능</a>
          <a href="#how">이용 방법</a>
          <a href="#footer">안내사항</a>
          <button type="button" className="landing__btn landing__btn--primary" onClick={onStart}>
            무료로 시작하기
          </button>
        </nav>
      </header>

      <section className="landing__hero">
        <span className="landing__hero-badge">무료 · 로그인 없이 바로 시작</span>
        <h1>
          폐업, 흩어진 정보 대신
          <br />내 상황에 맞는 절차만
        </h1>
        <p className="landing__hero-lead">
          업종·직원·임대 여부 몇 가지만 알려주면 신고 절차, 세무 일정, 지원금까지 필요한 것만
          추려서 마감 순서대로 안내해 드려요.
        </p>
        <div className="landing__hero-actions">
          <button type="button" className="landing__btn landing__btn--primary" onClick={onStart}>
            무료로 시작하기
          </button>
          <a href="#features" className="landing__btn landing__btn--secondary">
            기능 살펴보기
          </a>
        </div>
      </section>

      <section className="landing__mockup">
        <div className="landing__mockup-frame">
          <div className="landing__mockup-titlebar">
            <span className="landing__mockup-dot" style={{ background: '#ff5f57' }} />
            <span className="landing__mockup-dot" style={{ background: '#febc2e' }} />
            <span className="landing__mockup-dot" style={{ background: '#28c840' }} />
            <span className="landing__mockup-url">localhost:5173</span>
          </div>
          <div className="landing__mockup-body">
            <div className="landing__mockup-header">
              <h2>소상공인 폐업 도우미</h2>
              <div className="landing__mockup-actions">
                <span>조건 다시 입력</span>
                <span>체크 상태 초기화</span>
              </div>
            </div>
            <p className="landing__mockup-progress-label">전체 진행률 4/9 완료</p>
            <div className="landing__mockup-progress-bar">
              <div className="landing__mockup-progress-fill" style={{ width: '44%' }} />
            </div>
            <div className="landing__mockup-buttons">
              <div className="landing__mockup-btn landing__mockup-btn--active">
                <span className="landing__mockup-btn-title">전체 보기</span>
                <span className="landing__mockup-btn-count">9개 항목</span>
              </div>
              <div className="landing__mockup-btn">
                <span className="landing__mockup-btn-title">폐업 신고</span>
                <span className="landing__mockup-btn-count">5개 항목</span>
              </div>
              <div className="landing__mockup-btn">
                <span className="landing__mockup-btn-title">세무 신고</span>
                <span className="landing__mockup-btn-count">2개 항목</span>
              </div>
              <div className="landing__mockup-btn">
                <span className="landing__mockup-btn-title">지원금</span>
                <span className="landing__mockup-btn-count">2개 항목</span>
              </div>
            </div>
            <div className="landing__mockup-tasks">
              <div className="landing__mockup-task">
                <span className="landing__mockup-checkbox landing__mockup-checkbox--checked" />
                <span className="landing__mockup-task-title">부가세 확정신고 일정 안내</span>
                <span className="landing__mockup-dday landing__mockup-dday--urgent">D-6</span>
              </div>
              <div className="landing__mockup-task">
                <span className="landing__mockup-checkbox" />
                <span className="landing__mockup-task-title">4대보험 상실신고</span>
                <span className="landing__mockup-dday">D-14</span>
              </div>
              <div className="landing__mockup-task">
                <span className="landing__mockup-checkbox" />
                <span className="landing__mockup-task-title">점포철거비 지원 (희망리턴패키지)</span>
                <span className="landing__mockup-dday">D-21</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing__problems">
        {problems.map((problem) => (
          <div key={problem.title} className="landing__problem">
            <p className="landing__problem-title">{problem.title}</p>
            <p className="landing__problem-body">{problem.body}</p>
          </div>
        ))}
      </section>

      <section id="features" className="landing__features">
        <h2>필요한 것만, 순서대로</h2>
        <p className="landing__section-lead">
          한 번의 진단으로 내 상황에 맞는 절차·일정·지원금만 추려서 보여드려요.
        </p>
        <div className="landing__feature-grid">
          {features.map((feature) => (
            <div key={feature.title} className="landing__feature">
              <div className="landing__feature-icon" />
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="landing__how">
        <h2>3단계로 끝내요</h2>
        <div className="landing__steps">
          {steps.map((step) => (
            <div key={step.label} className="landing__step">
              <span className="landing__step-label">{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing__cta">
        <h2>지금, 내 상황부터 확인해 보세요</h2>
        <p>회원가입도, 결제도 없어요. 1분이면 시작할 수 있어요.</p>
        <button type="button" className="landing__btn landing__btn--primary" onClick={onStart}>
          무료로 시작하기
        </button>
      </section>

      <footer id="footer" className="landing__footer">
        <span className="landing__brand">소상공인 폐업 도우미</span>
        <p>
          본 서비스는 세무·법률 대리 업무를 수행하지 않으며, 절차 안내와 공식 출처 링크만
          제공합니다. 정확한 세율·금액·기한은 관할 기관(세무서, 홈택스, 정부24 등)에서
          확인하세요.
        </p>
      </footer>
    </main>
  )
}

export default Landing
