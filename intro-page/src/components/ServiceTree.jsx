import './ServiceTree.css'

const VB_WIDTH = 900
const BRANCH_X = 450
const BRANCH_Y = 90
const FIRST_Y = 220
const STEP_GAP = 160
const BOTTOM_PAD = 80

const LEFT_XS = [340, 210]
const RIGHT_XS = [560, 690]

function buildPoints(count, xs) {
  return Array.from({ length: count }, (_, i) => ({
    x: xs[i % 2],
    y: FIRST_Y + i * STEP_GAP,
  }))
}

function buildSmoothPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2
    const yc = (points[i].y + points[i + 1].y) / 2
    d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`
  }
  const last = points.length - 1
  d += ` Q ${points[last - 1].x} ${points[last - 1].y}, ${points[last].x} ${points[last].y}`
  return d
}

function ServiceTree({ roommateSteps, meetingSteps }) {
  const leftPoints = buildPoints(roommateSteps.length, LEFT_XS)
  const rightPoints = buildPoints(meetingSteps.length, RIGHT_XS)

  const branchPoint = { x: BRANCH_X, y: BRANCH_Y }
  const leftPath = buildSmoothPath([branchPoint, ...leftPoints])
  const rightPath = buildSmoothPath([branchPoint, ...rightPoints])
  const trunkPath = `M ${BRANCH_X} 0 L ${BRANCH_X} ${BRANCH_Y}`

  const lastLeftY = leftPoints[leftPoints.length - 1].y
  const lastRightY = rightPoints[rightPoints.length - 1].y
  const height = Math.max(lastLeftY, lastRightY) + BOTTOM_PAD

  const dividerPath = `M ${BRANCH_X} ${BRANCH_Y} L ${BRANCH_X} ${height}`

  const leftTitleX = (LEFT_XS[0] + LEFT_XS[1]) / 2
  const rightTitleX = (RIGHT_XS[0] + RIGHT_XS[1]) / 2
  const titleY = BRANCH_Y + 32

  const pct = (v, total) => `${(v / total) * 100}%`

  return (
    <div className="service-tree">
      <div className="tree-common-group">
        <div className="tree-common-card">
          <span className="tree-common-icon">🎓</span>
          <h3>학교 인증 + 취미 발견 테스트 </h3>
        </div>
        <p className="tree-common-desc">학교 인증 + 취미 발견 테스트로 첫걸음을 떼요 🎓 </p>
      </div>

      <div className="tree-common-group">
        <div className="tree-common-card">
          <span className="tree-common-icon">🧭</span>
          <h3>분기 선택</h3>
        </div>
        <p className="tree-common-desc">연애 / 생활 성향 중 생활 성향을 골라 테스트를 진행해요 🧭</p>
      </div>

      <div className="tree-wrap" style={{ aspectRatio: `${VB_WIDTH} / ${height}` }}>
        <svg
          className="tree-svg"
          viewBox={`0 0 ${VB_WIDTH} ${height}`}
          preserveAspectRatio="none"
        >
          <path d={trunkPath} className="tree-path-trunk" />
          <path d={dividerPath} className="tree-path-divider" />
          <path d={leftPath} className="tree-path-track tree-path-roommate" />
          <path d={rightPath} className="tree-path-track tree-path-meeting" />
        </svg>

        <div
          className="tree-track-title tree-track-title-roommate"
          style={{ left: pct(leftTitleX, VB_WIDTH), top: pct(titleY, height) }}
        >
          🏠 룸메이트 매칭 흐름
        </div>
        <div
          className="tree-track-title tree-track-title-meeting"
          style={{ left: pct(rightTitleX, VB_WIDTH), top: pct(titleY, height) }}
        >
          💑 과팅 매칭 흐름
        </div>

        {leftPoints.map((p, i) => (
          <div
            className="tree-step"
            key={`roommate-${roommateSteps[i].label}`}
            style={{ left: pct(p.x, VB_WIDTH), top: pct(p.y, height) }}
          >
            <span className="tree-dot tree-dot-roommate">{i + 1}</span>
            <div className="tree-label tree-label-left">
              <strong>{roommateSteps[i].label}</strong>
              <span>{roommateSteps[i].desc}</span>
            </div>
          </div>
        ))}

        {rightPoints.map((p, i) => (
          <div
            className="tree-step"
            key={`meeting-${meetingSteps[i].label}`}
            style={{ left: pct(p.x, VB_WIDTH), top: pct(p.y, height) }}
          >
            <span className="tree-dot tree-dot-meeting">{i + 1}</span>
            <div className="tree-label tree-label-right">
              <strong>{meetingSteps[i].label}</strong>
              <span>{meetingSteps[i].desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServiceTree