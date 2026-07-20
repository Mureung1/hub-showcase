function ProjectIntro() {
  const features = [
    {
      label: '01',
      title: '채용공고 기반 자격증 수요 분석',
      desc: '사람인 공식 API로 수집한 채용공고의 우대조건을 분석해, 자격증이 얼마나 자주·얼마나 강하게 언급되는지 근거와 함께 보여줍니다.',
    },
    {
      label: '02',
      title: '자격증 취득 경로 최적화',
      desc: '선수조건과 응시 일정을 그래프로 모델링해 위상 정렬로 최적 취득 순서를 계산합니다. 순환 참조도 자동으로 탐지합니다.',
    },
    {
      label: '03',
      title: '개인 진행 상황 대시보드',
      desc: '계획한 경로 대비 취득 완료·준비 중·예정 상태를 추적하고, 다가오는 시험 일정의 임박도를 보여줍니다.',
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

      <p className="intro__eyebrow">채용공고 데이터 기반 자격증 의사결정 도구</p>
      <h1 className="intro__title">CERT PLANNER</h1>
      <p className="intro__subtitle">
        실제 채용공고 데이터를 기반으로 목표 직무에 정말 필요한 자격증을 근거와 함께 걸러주고,
        최적의 취득 순서까지 계산해줍니다.
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
