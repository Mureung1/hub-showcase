import HeroIllustration from './HeroIllustration.jsx'
import { HistoryIcon, TargetIcon, SparkIcon, BookIcon, GrowthIcon, NetworkIcon, TrophyIcon } from './icons.jsx'

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

const HOW_IT_WORKS = [
  {
    icon: <HistoryIcon />,
    title: '커밋 히스토리 분석',
    description: 'GitHub 커밋 로그에서 자주 쓰는 언어, 프레임워크, 코드 패턴을 파악해요.',
  },
  {
    icon: <TargetIcon />,
    title: '관심 분야 매칭',
    description: '관심 태그와 실력 수준에 맞는 오픈소스 레포를 찾아요.',
  },
  {
    icon: <SparkIcon />,
    title: '맞춤 이슈 추천',
    description: 'good first issue, help wanted 라벨 중 지금 풀 수 있는 이슈를 골라줘요.',
  },
  {
    icon: <BookIcon />,
    title: '기여 가이드 요약',
    description: 'CONTRIBUTING.md와 이슈 내용을 요약해 바로 시작할 수 있게 도와줘요.',
  },
]

function ProjectIntro() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <span className="badge">Mini Mission · N034 김선호</span>
          <h1>
            내 <span className="highlight">커밋 히스토리</span>가
            <br />
            다음 오픈소스 기여처를 알려줘요
          </h1>
          <p className="lead">
            Git 커밋 히스토리와 관심 기술 스택을 분석해서, 지금 나에게 딱 맞는
            오픈소스 이슈를 찾아 추천해주는 에이전트예요.
          </p>
        </div>

        <div className="hero-visual">
          <HeroIllustration />
          <div className="match-card">
            <div className="match-card-header">
              <span className="repo-avatar">RA</span>
              <div>
                <p className="repo-name">repo-recommender/agent-core</p>
                <p className="repo-issue">Issue #482 · good first issue</p>
              </div>
            </div>
            <p className="match-reason">
              최근 커밋에서 <strong>React</strong>·<strong>비동기 처리</strong> 패턴이
              자주 발견되어 추천했어요.
            </p>
            <div className="match-score">
              <div className="match-score-bar">
                <span style={{ width: '92%' }} />
              </div>
              <span className="match-score-label">매칭도 92%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="why-section">
        <h2 className="section-title">오픈소스, 왜 기여해야 할까요?</h2>
        <ul className="why-list">
          {WHY_CONTRIBUTE.map((item) => (
            <li key={item.title} className="why-item">
              <div className="icon-badge">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="how-section">
        <h2 className="section-title">이렇게 추천해요</h2>
        <ol className="how-list">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="how-item">
              <span className="step-number">{index + 1}</span>
              <div className="icon-badge icon-badge-sm">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}

export default ProjectIntro
