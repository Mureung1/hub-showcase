import './ProjectIntro.css'

function ProjectIntro() {
  return (
    <div className="project-intro">
      <header className="intro-header">
        <h1 className="project-title">자취방 청결관리사</h1>
        <p className="project-tagline">
          부엌과 화장실의 청결 상태를 계속 기억하고 추적해, 문제를 먼저 짚어주는 에이전트
        </p>
      </header>

      <section className="intro-section">
        <h2>문제 정의</h2>
        <p>
          자취생은 소모품이 언제 떨어지는지, 벌레나 냄새 같은 이상 신호가 우연인지
          반복되는 문제인지 판단할 이력이 없습니다. 그 결과 문제를 방치하거나,
          반대로 과잉대응하게 됩니다.
        </p>
      </section>

      <section className="intro-section">
        <h2>핵심 방향</h2>
        <ul className="direction-list">
          <li>
            <strong>재고 축</strong> — 청결 유지 소모품 현황 추적
          </li>
          <li>
            <strong>이벤트 축</strong> — 벌레/냄새 등 위생 이상 신호 이력 추적
          </li>
        </ul>
      </section>
    </div>
  )
}

export default ProjectIntro
