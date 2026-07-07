import './RoadTimeline.css'

const ROAD_WIDTH = 320
const X_LEFT = 76
const X_RIGHT = 244
const TOP_PAD = 50
const STEP_GAP = 150
const BOTTOM_PAD = 50

function buildPoints(count) {
  return Array.from({ length: count }, (_, i) => ({
    x: i % 2 === 0 ? X_LEFT : X_RIGHT,
    y: TOP_PAD + i * STEP_GAP,
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

function RoadTimeline({ title, emoji, accent, steps }) {
  const points = buildPoints(steps.length)
  const pathD = buildSmoothPath(points)
  const height = TOP_PAD + (steps.length - 1) * STEP_GAP + BOTTOM_PAD

  return (
    <div className="road-timeline">
      <h2 className="road-title">
        {emoji} {title}
      </h2>
      <div className="road-wrap" style={{ height, '--accent': accent }}>
        <svg
          className="road-svg"
          width={ROAD_WIDTH}
          height={height}
          viewBox={`0 0 ${ROAD_WIDTH} ${height}`}
        >
          <path d={pathD} className="road-path-bg" />
          <path d={pathD} className="road-path-line" />
        </svg>

        {steps.map((step, i) => {
          const side = points[i].x === X_LEFT ? 'right' : 'left'
          return (
            <div
              className="road-step"
              key={step.label}
              style={{ left: points[i].x, top: points[i].y }}
            >
              <span className="road-dot">{i + 1}</span>
              <div className={`road-label road-label-${side}`}>
                <strong>{step.label}</strong>
                <span>{step.desc}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RoadTimeline
