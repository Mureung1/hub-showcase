import './ProjectIntro.css'

const FEATURES = [
  {
    title: 'AI 논문 마인드맵 시각화',
    description: '연구 논문 간의 흐름과 관계를 인터랙티브한 마인드맵으로 그려줍니다.',
  },
  {
    title: '연구실 진로 및 채용 매칭',
    description: '연구실 출신 동문들의 학계·산업계 진출 경로를 추적하고, 동문이 재직 중인 기업의 채용 공고를 마인드맵 위에 연결합니다.',
  },
  {
    title: '최신 연구동향',
    description: '관심 분야의 최신 논문과 트렌드를 지속적으로 수집해 마인드맵에 반영합니다.',
  },
  {
    title: 'Obsidian 완벽 연동',
    description: '마인드맵을 마크다운 노트로 내보내 개인 Obsidian 볼트에 그대로 이식합니다.',
  },
]

function ProjectIntro() {
  return (
    <section className="project-intro">
      <h1>ScholarMap AI</h1>
      <p className="tagline">
        연구의 맥락을 시각적 마인드맵으로 설계하고, 나만의 Obsidian 노트로 이식하는 도구
      </p>
      <p className="description">
        논문 간의 계보, 연구실 동문의 커리어 경로, 실시간 채용 정보를 하나의 지도 위에서
        연결해 연구자가 다음 방향을 더 쉽게 찾을 수 있도록 돕습니다.
      </p>
      <ul className="feature-list">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProjectIntro
