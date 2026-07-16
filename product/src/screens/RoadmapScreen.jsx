import TopBar from '../components/TopBar'
import { SUPPORTED_JOB, ROADMAP } from '../data/mock'

// 05 준비 로드맵. 미체크 항목을 채우는 4단계를 타임라인으로 보여준다.
function RoadmapScreen({ go }) {
  return (
    <>
      <TopBar step={5} label="준비 로드맵" job={SUPPORTED_JOB} backTo="checklist" backLabel="합격 조건" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="roadmap-header" id="roadmap-summary">
            <span className="eyebrow">체크리스트 기반 추천</span>
            <h1><span className="roadmap-job-badge">{SUPPORTED_JOB}</span> 미체크 항목을 채우는 4단계 로드맵</h1>
            <p>통계·역산·체크리스트에서 미체크로 남은 항목을 필수 우선으로 정렬했습니다. 각 단계는 그것을 하면 어떤 미체크 항목이 채워지는지 연결합니다.</p>
            <div className="data-note">
              <span>목표: 신입·주니어 지원 가능</span>
              <span>산출물: 배포 URL · README · GitHub 기록</span>
            </div>
          </header>

          <ol className="roadmap-timeline">
            {ROADMAP.map((step, i) => (
              <li className="roadmap-item" id={`step-${i + 1}`} key={step.title}>
                <div className="roadmap-marker">
                  <span className="roadmap-dot">{i + 1}</span>
                  {i < ROADMAP.length - 1 && <span className="roadmap-connector"></span>}
                </div>
                <article className="roadmap-card">
                  <div className="roadmap-card-heading">
                    <span className="roadmap-phase">{step.phase}</span>
                    <h2 className="roadmap-title">{step.title}</h2>
                    <span className="roadmap-duration">{step.priority}</span>
                  </div>
                  <p className="roadmap-description">
                    {step.desc} <strong>채우는 항목:</strong> {step.fills}.
                  </p>
                  <div className="roadmap-topics">
                    {step.chips.map((chip) => (
                      <span className="roadmap-topic-chip" key={chip.label}>
                        {chip.logo && <img src={`/logos/${chip.logo}.svg`} alt="" />}{chip.label}
                      </span>
                    ))}
                  </div>
                  <div className="roadmap-reason">
                    <span className="roadmap-reason-icon">i</span>
                    <div>
                      <p className="roadmap-reason-label">{step.reasonLabel}</p>
                      <p className="roadmap-reason-text">{step.reason}</p>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>

          <div className="nav-actions">
            <button className="btn btn-secondary" onClick={() => go('checklist')}>← 합격 조건 다시 보기</button>
            <button className="btn btn-primary" onClick={() => go('select')}>다른 직무 분석하기 →</button>
          </div>
        </article>

        <aside className="floating-nav" aria-label="로드맵 목차">
          <p className="floating-nav__label">로드맵</p>
          <a className="is-current" href="#roadmap-summary"><span className="dot"></span>요약</a>
          {ROADMAP.map((step, i) => (
            <a href={`#step-${i + 1}`} key={step.title}><span className="dot"></span>{step.phase.split(' · ')[0]}</a>
          ))}
        </aside>
      </main>
    </>
  )
}

export default RoadmapScreen
