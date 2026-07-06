function ProjectIntro() {
  const features = [
    {
      label: '01',
      title: '방치 감지',
      desc: '커밋 빈도와 미해결 이슈를 종합해 지금 손봐야 할 프로젝트를 자동으로 짚어냅니다.',
    },
    {
      label: '02',
      title: '구조 기반 변경 분류',
      desc: '커밋 메시지가 아니라 실제 코드 구조 변화(AST)를 보고 기능·수정·문서 변경을 구분합니다.',
    },
    {
      label: '03',
      title: '문서 갱신 제안',
      desc: '코드는 바뀌었는데 문서가 그대로인 지점을 찾아, 덮어쓰지 않고 갱신안만 제안합니다.',
    },
  ]

  return (
    <section className="intro">
      <div className="intro__pulse" aria-hidden="true">
        <svg viewBox="0 0 400 80" className="pulse-svg">
          <polyline
            className="pulse-line"
            points="0,40 60,40 80,40 95,10 110,70 125,40 160,40 180,40 195,15 210,65 225,40 400,40"
            fill="none"
          />
        </svg>
      </div>

      <p className="intro__eyebrow">개인 사이드 프로젝트 관제 에이전트</p>
      <h1 className="intro__title">DevPulse</h1>
      <p className="intro__subtitle">
        여러 레포에 흩어진 커밋과 이슈의 맥박을 읽어, 지금 무엇을 먼저 봐야 하는지 알려줍니다.
      </p>

      <ul className="intro__features">
        {features.map((f) => (
          <li key={f.label} className="intro__feature">
            <span className="intro__feature-label">{f.label}</span>
            <div>
              <h2 className="intro__feature-title">{f.title}</h2>
              <p className="intro__feature-desc">{f.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProjectIntro
