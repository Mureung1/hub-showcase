import './ProjectIntro.css'

const features = [
  {
    icon: '✉️',
    title: '하루 1통 편지',
    desc: '빠른 소비 없이 하루에 한 번, 신중하게 씁니다. 답장은 카운트에서 제외됩니다.',
  },
  {
    icon: '🤝',
    title: '이음',
    desc: '글과 글, 생각과 생각 사이에 다리를 놓습니다. AI가 비슷하거나 반대되는 시선을 가진 편지를 연결합니다.',
  },
  {
    icon: '✍️',
    title: '직접 타이핑',
    desc: '붙여넣기 없이 손으로 직접 씁니다. 그 수고가 진심의 증거가 됩니다.',
  },
]

const flow = [
  { step: '01', title: '편지 작성', desc: '오늘 하루를 담아 한 통의 편지를 씁니다.' },
  { step: '02', title: '모음소 대기', desc: '편지가 모음소(대기열)에서 하룻밤을 기다립니다.' },
  { step: '03', title: '이음', desc: '다음 날 AI가 글과 글 사이에 다리를 놓아 어울리는 편지를 연결합니다.' },
  { step: '04', title: '답장 또는 새 편지', desc: '받은 편지에 답장하거나, 새로운 연결을 시작합니다.' },
]

function ProjectIntro() {
  return (
    <div className="pi-wrap">
      <section className="pi-hero">
        <span className="pi-badge">편지 기반 익명 연결 플랫폼</span>
        <h1 className="pi-title">Bridge</h1>
        <p className="pi-tagline">
          빠르게 소비되는 세상에서,<br />
          천천히 쓰고 기다리는 연결
        </p>
      </section>

      <section className="pi-section">
        <h2 className="pi-section-title">문제 정의</h2>
        <div className="pi-problem">
          <p className="pi-problem-main">
            빠르게 소비되는 SNS에서 사람들은 <strong>자신만의 글을 처음부터 끝까지 쓰고</strong>, 다른 생각과 느슨하게 연결될 여유를 잃어가고 있다.
          </p>
          <ul className="pi-problem-list">
            <li>피드는 빠르게 흘러가고, 내 글이 머무를 자리가 없다</li>
            <li>완전한 공개도, 완전한 사적 대화도 아닌 — 그 사이 어딘가의 공간이 없다</li>
            <li>나의 글이 누군가의 생각과 닿을 수 있다는 경험이 없다</li>
          </ul>
        </div>
      </section>

      <section className="pi-section">
        <h2 className="pi-section-title">사용자 흐름</h2>
        <div className="pi-flow">
          {flow.map(({ step, title, desc }) => (
            <div key={step} className="pi-flow-item">
              <span className="pi-flow-step">{step}</span>
              <div className="pi-flow-body">
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pi-section">
        <h2 className="pi-section-title">핵심 기능</h2>
        <div className="pi-features">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="pi-feature-card">
              <span className="pi-feature-icon">{icon}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="pi-quote">
        <blockquote>"연결은 속도가 아니라 깊이에서 온다"</blockquote>
      </footer>
    </div>
  )
}

export default ProjectIntro
