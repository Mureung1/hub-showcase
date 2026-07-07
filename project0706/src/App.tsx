import './App.css'

type Problem = {
  icon: string
  title: string
  description: string
}

type Feature = {
  title: string
  description: string
  points: string[]
  accent: string
}

type Effect = {
  target: string
  value: string
  detail: string
}

const problems: Problem[] = [
  {
    icon: '01',
    title: '사람마다 다른 별점 기준',
    description: '누군가의 5점은 다른 사람에게 3점일 수 있어 평점만으로 취향을 판단하기 어렵습니다.',
  },
  {
    icon: '02',
    title: '광고 리뷰와 낮은 신뢰도',
    description: '상업적 리뷰가 섞이면 실제 방문자의 경험과 추천의 무게가 흐려집니다.',
  },
  {
    icon: '03',
    title: '신규 가게의 낮은 노출',
    description: '리뷰가 적은 소상공인 가게는 좋은 경험을 제공해도 발견되기까지 오래 걸립니다.',
  },
]

const features: Feature[] = [
  {
    title: '취향 매칭 시스템',
    description: '나와 비슷한 취향의 리뷰어가 남긴 리뷰를 우선적으로 보여줍니다.',
    points: ['매운맛 선호', '가성비 중시', '분위기 중요'],
    accent: '82%',
  },
  {
    title: '리뷰어 신뢰도 시스템',
    description: '리뷰어의 활동 품질을 기준으로 더 믿을 수 있는 추천을 만듭니다.',
    points: ['실제 방문 인증', '도움된 리뷰 평가', '신뢰도 점수 제공'],
    accent: 'Trust',
  },
  {
    title: '숨은 맛집 발견 시스템',
    description: '신규 가게와 덜 알려진 맛집이 사용자에게 자연스럽게 노출될 수 있게 합니다.',
    points: ['신규 가게 리뷰 보상', '숨은 맛집 탐험 퀘스트', '신규 가게 추천 탭'],
    accent: 'New',
  },
]

const effects: Effect[] = [
  {
    target: '소비자',
    value: '신뢰할 수 있는 리뷰 확보',
    detail: '별점 평균보다 나와 맞는 사람의 경험을 기준으로 선택합니다.',
  },
  {
    target: '소상공인',
    value: '신규 노출 기회 증가',
    detail: '광고비보다 실제 방문 경험과 취향 연결이 발견의 기준이 됩니다.',
  },
  {
    target: '플랫폼',
    value: '광고 의존도 감소',
    detail: '리뷰어 신뢰와 취향 데이터로 지속 가능한 추천 품질을 만듭니다.',
  },
]

function App() {
  return (
    <main className="page-shell">
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#hero" aria-label="TasteMatch home">
          <span className="brand-mark">T</span>
          TasteMatch
        </a>
        <div className="nav-links">
          <a href="#problem">문제</a>
          <a href="#solution">해결</a>
          <a href="#features">기능</a>
          <a href="#effects">효과</a>
        </div>
      </nav>

      <section className="hero-section" id="hero">
        <div className="hero-copy">
          <p className="eyebrow">Reviewer-first restaurant review MVP</p>
          <h1>나와 입맛이 비슷한 사람의 리뷰를 믿으세요</h1>
          <p className="hero-description">
            기존의 획일적인 별점 시스템을 넘어, 취향 기반 리뷰 추천으로 진짜 맛집을
            발견하세요.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#solution">
              프로젝트 소개 보기
            </a>
            <a className="button secondary" href="#features">
              핵심 기능 보기
            </a>
          </div>
        </div>

        <aside className="hero-panel" aria-label="TasteMatch recommendation preview">
          <div className="panel-header">
            <div>
              <span className="status-dot" />
              취향 기반 추천
            </div>
            <span>MVP Preview</span>
          </div>
          <div className="match-card">
            <p>당신과 취향 일치도</p>
            <strong>82%</strong>
            <div className="progress-track">
              <span className="progress-fill" />
            </div>
          </div>
          <div className="reviewer-card">
            <div className="avatar">김</div>
            <div>
              <strong>김민서 리뷰어</strong>
              <p>매운맛, 가성비, 조용한 분위기를 중요하게 봅니다.</p>
            </div>
          </div>
          <div className="recommendation-list">
            <div>
              <span>추천 기준</span>
              <strong>비슷한 취향의 리뷰어가 재방문한 곳</strong>
            </div>
            <div>
              <span>신뢰 기준</span>
              <strong>방문 인증 리뷰 + 도움 평가</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="section" id="problem">
        <div className="section-heading">
          <p className="eyebrow">Problem</p>
          <h2>기존 리뷰 플랫폼은 가게 중심입니다</h2>
          <p>평점은 편리하지만, 사용자의 취향과 리뷰의 신뢰도를 충분히 설명하지 못합니다.</p>
        </div>
        <div className="card-grid three">
          {problems.map((problem) => (
            <article className="card problem-card" key={problem.title}>
              <span className="number-icon">{problem.icon}</span>
              <h3>{problem.title}</h3>
              <p>{problem.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section solution-section" id="solution">
        <div className="section-heading">
          <p className="eyebrow">Solution</p>
          <h2>우리는 리뷰보다 리뷰어를 봅니다</h2>
          <p>
            기존 플랫폼은 가게를 평가하지만, TasteMatch는 리뷰어의 취향과 신뢰도를
            평가합니다.
          </p>
        </div>
        <div className="comparison">
          <article className="compare-card muted">
            <span>기존 플랫폼</span>
            <h3>가게 중심 추천</h3>
            <ul>
              <li>가게 중심</li>
              <li>단순 별점</li>
              <li>광고 영향</li>
            </ul>
          </article>
          <article className="compare-card highlighted">
            <span>우리 서비스</span>
            <h3>리뷰어 중심 추천</h3>
            <ul>
              <li>리뷰어 중심</li>
              <li>취향 기반 추천</li>
              <li>방문 인증 리뷰</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-heading">
          <p className="eyebrow">Features</p>
          <h2>MVP에서 검증할 핵심 기능</h2>
          <p>사용자가 믿을 사람을 찾고, 그 사람이 좋아한 식당을 발견하는 흐름에 집중합니다.</p>
        </div>
        <div className="card-grid three">
          {features.map((feature) => (
            <article className="card feature-card" key={feature.title}>
              <div className="feature-top">
                <h3>{feature.title}</h3>
                <span>{feature.accent}</span>
              </div>
              <p>{feature.description}</p>
              <ul>
                {feature.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section effects-section" id="effects">
        <div className="section-heading">
          <p className="eyebrow">Expected Effects</p>
          <h2>취향이 연결되면 리뷰의 가치가 달라집니다</h2>
        </div>
        <div className="card-grid three">
          {effects.map((effect) => (
            <article className="effect-card" key={effect.target}>
              <span>{effect.target}</span>
              <h3>{effect.value}</h3>
              <p>{effect.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div>
          <strong>TasteMatch</strong>
          <p>나와 취향이 비슷한 리뷰어를 통해 진짜 맛집을 발견하는 음식점 리뷰 플랫폼 MVP</p>
        </div>
        <a href="#" aria-label="GitHub placeholder">
          GitHub 링크 준비 중
        </a>
      </footer>
    </main>
  )
}

export default App
