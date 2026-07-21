import type { DistributionPoint } from '../lib/maxwellBoltzmann'

interface SpeedDistributionChartProps {
  mainCurve: DistributionPoint[]
  mainLabel: string
  mainMostProbableSpeed: number
  snapshotCurve?: DistributionPoint[]
  snapshotLabel?: string
}

const WIDTH = 560
const HEIGHT = 320
const PAD_LEFT = 16
const PAD_RIGHT = 16
const PAD_TOP = 16
const PAD_BOTTOM = 36
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM

function buildPath(points: DistributionPoint[], xMax: number, yMax: number): string {
  return points
    .map((p, i) => {
      const x = PAD_LEFT + (p.speed / xMax) * PLOT_WIDTH
      const y = PAD_TOP + PLOT_HEIGHT - (p.density / yMax) * PLOT_HEIGHT
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export default function SpeedDistributionChart({
  mainCurve,
  mainLabel,
  mainMostProbableSpeed,
  snapshotCurve,
  snapshotLabel,
}: SpeedDistributionChartProps) {
  const xMax = Math.max(
    mainCurve[mainCurve.length - 1]?.speed ?? 1,
    snapshotCurve?.[snapshotCurve.length - 1]?.speed ?? 0,
  )
  const yMax =
    Math.max(
      ...mainCurve.map((p) => p.density),
      ...(snapshotCurve?.map((p) => p.density) ?? [0]),
    ) * 1.15

  const mainPath = buildPath(mainCurve, xMax, yMax)
  const snapshotPath = snapshotCurve ? buildPath(snapshotCurve, xMax, yMax) : null
  const vpX = PAD_LEFT + (mainMostProbableSpeed / xMax) * PLOT_WIDTH

  const tickCount = 5
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (xMax * i) / tickCount)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      role="img"
      aria-label={`${mainLabel} 분자 속도 분포 그래프`}
    >
      <line
        x1={PAD_LEFT}
        y1={PAD_TOP + PLOT_HEIGHT}
        x2={PAD_LEFT + PLOT_WIDTH}
        y2={PAD_TOP + PLOT_HEIGHT}
        stroke="var(--color-border-card-strong)"
        strokeWidth={1}
      />
      <line
        x1={PAD_LEFT}
        y1={PAD_TOP}
        x2={PAD_LEFT}
        y2={PAD_TOP + PLOT_HEIGHT}
        stroke="var(--color-border-card-strong)"
        strokeWidth={1}
      />

      {ticks.map((t) => {
        const x = PAD_LEFT + (t / xMax) * PLOT_WIDTH
        return (
          <g key={t}>
            <line
              x1={x}
              y1={PAD_TOP + PLOT_HEIGHT}
              x2={x}
              y2={PAD_TOP + PLOT_HEIGHT + 4}
              stroke="var(--color-border-card-strong)"
              strokeWidth={1}
            />
            <text
              x={x}
              y={PAD_TOP + PLOT_HEIGHT + 18}
              fontSize={10}
              textAnchor="middle"
              fill="var(--color-text-muted)"
            >
              {Math.round(t)}
            </text>
          </g>
        )
      })}
      <text
        x={PAD_LEFT + PLOT_WIDTH / 2}
        y={HEIGHT - 4}
        fontSize={11}
        textAnchor="middle"
        fill="var(--color-text-muted)"
      >
        분자 속도 (m/s)
      </text>

      {snapshotPath && (
        <path
          d={snapshotPath}
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      )}

      <line
        x1={vpX}
        y1={PAD_TOP}
        x2={vpX}
        y2={PAD_TOP + PLOT_HEIGHT}
        stroke="var(--color-accent)"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.5}
      />
      <text
        x={vpX}
        y={PAD_TOP + PLOT_HEIGHT - 8}
        fontSize={10}
        textAnchor="middle"
        fill="var(--color-accent)"
      >
        최빈 속도 {Math.round(mainMostProbableSpeed)} m/s
      </text>

      <path d={mainPath} fill="none" stroke="var(--color-accent)" strokeWidth={2} />

      <g transform={`translate(${PAD_LEFT + 8}, ${PAD_TOP + 8})`}>
        <line x1={0} y1={0} x2={16} y2={0} stroke="var(--color-accent)" strokeWidth={2} />
        <text x={20} y={3.5} fontSize={11} fill="var(--color-text-primary)">
          {mainLabel}
        </text>
        {snapshotLabel && (
          <>
            <line
              x1={0}
              y1={16}
              x2={16}
              y2={16}
              stroke="var(--color-text-muted)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text x={20} y={19.5} fontSize={11} fill="var(--color-text-muted)">
              {snapshotLabel} (비교선)
            </text>
          </>
        )}
      </g>
    </svg>
  )
}
