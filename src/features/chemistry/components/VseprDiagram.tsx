export interface VseprBond {
  /** 각도(도), 수학 표준 각(0=오른쪽, 90=위) */
  angle: number
  style: 'plain' | 'wedge' | 'dash'
  label: string
}

export interface VseprLonePair {
  angle: number
}

export interface VseprDiagramSpec {
  centerSymbol: string
  bonds: VseprBond[]
  lonePairs: VseprLonePair[]
  angleArc: { fromAngle: number; toAngle: number; label: string }
}

const WIDTH = 380
const HEIGHT = 300
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 + 6 }
const BOND_START_GAP = 16
const BOND_LENGTH = 78
const LABEL_GAP = 16
// 결합선/쐐기는 전부 반지름 BOND_START_GAP에서 시작하므로, 호 반지름을 그보다 작게 두면
// 어떤 두 결합 사이에 호를 걸어도 쐐기·대시 도형과 절대 겹치지 않는다.
const ARC_RADIUS = 12

function toXY(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: Math.cos(rad) * radius, y: -Math.sin(rad) * radius }
}

/** fromAngle→toAngle 사이 "더 짧은 쪽" 호를 따라가는 점들을 반환한다. */
function arcPoints(fromAngle: number, toAngle: number, radius: number) {
  let diff = toAngle - fromAngle
  diff = (((diff + 180) % 360) + 360) % 360 - 180
  const steps = 16
  const points: string[] = []
  for (let i = 0; i <= steps; i++) {
    const angle = fromAngle + (diff * i) / steps
    const p = toXY(angle, radius)
    points.push(`${CENTER.x + p.x},${CENTER.y + p.y}`)
  }
  return { points: points.join(' '), midAngle: fromAngle + diff / 2 }
}

export default function VseprDiagram({ spec }: { spec: VseprDiagramSpec }) {
  const { centerSymbol, bonds, lonePairs, angleArc } = spec
  const arc = arcPoints(angleArc.fromAngle, angleArc.toAngle, ARC_RADIUS)
  const arcLabelPos = toXY(arc.midAngle, ARC_RADIUS + 15)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      role="img"
      aria-label={`${centerSymbol} 중심 VSEPR 전자쌍 배치도`}
    >
      <polyline points={arc.points} fill="none" stroke="var(--color-text-muted)" strokeWidth={1} />
      <text
        x={CENTER.x + arcLabelPos.x}
        y={CENTER.y + arcLabelPos.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fill="var(--color-text-muted)"
      >
        {angleArc.label}
      </text>

      {bonds.map((bond, i) => {
        const start = toXY(bond.angle, BOND_START_GAP)
        const end = toXY(bond.angle, BOND_START_GAP + BOND_LENGTH)
        const x1 = CENTER.x + start.x
        const y1 = CENTER.y + start.y
        const x2 = CENTER.x + end.x
        const y2 = CENTER.y + end.y
        const labelPos = toXY(bond.angle, BOND_START_GAP + BOND_LENGTH + LABEL_GAP)
        const labelX = CENTER.x + labelPos.x
        const labelY = CENTER.y + labelPos.y

        if (bond.style === 'plain') {
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-text-primary)" strokeWidth={1.75} />
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" fontSize={15} fill="var(--color-text-primary)">
                {bond.label}
              </text>
            </g>
          )
        }

        if (bond.style === 'wedge') {
          const dx = x2 - x1
          const dy = y2 - y1
          const len = Math.hypot(dx, dy) || 1
          const perpX = -dy / len
          const perpY = dx / len
          const halfWidth = 5
          const points = `${x1},${y1} ${x2 + perpX * halfWidth},${y2 + perpY * halfWidth} ${x2 - perpX * halfWidth},${y2 - perpY * halfWidth}`
          return (
            <g key={i}>
              <polygon points={points} fill="var(--color-text-primary)" />
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" fontSize={15} fill="var(--color-text-primary)">
                {bond.label}
              </text>
            </g>
          )
        }

        // dash: 중심에서 멀어질수록 폭이 넓어지는 짧은 눈금들 (뒤쪽으로 향하는 결합)
        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.hypot(dx, dy) || 1
        const perpX = -dy / len
        const perpY = dx / len
        const tickCount = 5
        return (
          <g key={i}>
            {Array.from({ length: tickCount }, (_, t) => {
              const frac = (t + 1) / (tickCount + 1)
              const cx = x1 + dx * frac
              const cy = y1 + dy * frac
              const halfWidth = 1 + frac * 4
              return (
                <line
                  key={t}
                  x1={cx + perpX * halfWidth}
                  y1={cy + perpY * halfWidth}
                  x2={cx - perpX * halfWidth}
                  y2={cy - perpY * halfWidth}
                  stroke="var(--color-text-primary)"
                  strokeWidth={1.75}
                />
              )
            })}
            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" fontSize={15} fill="var(--color-text-primary)">
              {bond.label}
            </text>
          </g>
        )
      })}

      {lonePairs.map((lp, i) => {
        const cloudCenter = toXY(lp.angle, 30)
        const cx = CENTER.x + cloudCenter.x
        const cy = CENTER.y + cloudCenter.y
        const dotOffset = toXY(lp.angle + 90, 6)
        return (
          <g key={i}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={16}
              ry={9}
              transform={`rotate(${-lp.angle} ${cx} ${cy})`}
              fill="var(--color-accent-fill)"
              stroke="var(--color-accent)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle cx={cx + dotOffset.x} cy={cy + dotOffset.y} r={2} fill="var(--color-accent)" />
            <circle cx={cx - dotOffset.x} cy={cy - dotOffset.y} r={2} fill="var(--color-accent)" />
          </g>
        )
      })}

      <text
        x={CENTER.x}
        y={CENTER.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={20}
        fontWeight={600}
        fill="var(--color-text-primary)"
      >
        {centerSymbol}
      </text>
    </svg>
  )
}
