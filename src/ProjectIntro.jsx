import './ProjectIntro.css'

const week = [
  { day: '월', label: '가슴', state: 'plan' },
  { day: '화', label: '등', state: 'plan' },
  { day: '수', label: '하체', state: 'struck', tag: '무릎 통증' },
  { day: '목', label: '휴식', state: 'plan' },
  { day: '금', label: '하체', state: 'moved', tag: '이동됨' },
]

function ProjectIntro() {
  return (
    <section className="intro">
      <p className="intro-eyebrow">N001 · 강민구</p>

      <h1 className="intro-title">
        루틴은 계획대로 안 굴러간다.
        <br />
        <span className="intro-accent">그 순간을 처리하는 Agent.</span>
      </h1>

      <div className="intro-week-wrap">
        <div className="intro-week" aria-label="예외 발생 시 자동 재편성 예시">
          {week.map((d) => (
            <div key={d.day} className={`intro-day intro-day--${d.state}`}>
              <span className="intro-day-label">{d.day}</span>
              <span className="intro-day-exercise">{d.label}</span>
              {d.tag && (
                <span className="intro-day-tag">
                  {d.state === 'struck' && (
                    <span className="intro-tag-mark">!</span>
                  )}
                  {d.tag}
                </span>
              )}
            </div>
          ))}
        </div>

        <svg
          className="intro-week-link"
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M 50 2 Q 70 22 90 2" />
          <polygon points="90,2 86,4 87,-1" transform="translate(0,4)" />
        </svg>
      </div>

      <p className="intro-week-caption">
        수요일 하체 운동에 통증이 보고되면, 회복 간격과 부위 중복 금지 규칙을
        지키며 금요일로 재배치합니다.
      </p>

      <p className="intro-lead">
        AI 운동 루틴 적응 코치는 예정된 운동을 짜주는 앱이 아닙니다. 어깨가
        아프거나, 시간이 없거나, 지난주 하체를 건너뛴 날 — 그 예외를 받아 제약
        안에서 루틴을 다시 계산합니다.
      </p>

      <div className="intro-flow">
        <div className="intro-flow-step">
          <span className="intro-flow-label">입력</span>
          <p>오늘의 컨디션과 제약</p>
        </div>
        <div className="intro-flow-arrow">→</div>
        <div className="intro-flow-step">
          <span className="intro-flow-label">판단</span>
          <p>하드 제약 검증 + 재편성</p>
        </div>
        <div className="intro-flow-arrow">→</div>
        <div className="intro-flow-step">
          <span className="intro-flow-label">결과</span>
          <p>근거가 붙은 오늘의 루틴</p>
        </div>
      </div>
    </section>
  )
}

export default ProjectIntro
