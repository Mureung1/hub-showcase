interface AbsorptionBand {
  peakNm: number
  fwhmNm: number
  skew: 'symmetric' | 'broadTowardLonger' | 'broadTowardShorter'
}

interface CrystalFieldDiagramProps {
  dOrbitalGroups: number[]
  observedColor: { label: string; hex: string }
  deltaWavenumber_cm1: number
  maxDeltaWavenumber_cm1: number
  absorptionBand: AbsorptionBand
}

const SPLIT_WIDTH = 150
const SPLIT_HEIGHT = 170
const LINE_LENGTH = 26
const LINE_GAP = 7
const GROUP_SPACING = 44
const SPLIT_BASE_Y = SPLIT_HEIGHT - 24

// 가시광선 스펙트럼(400~700nm)의 근사 색 stop — 실측 분광 곡선이 아니라
// 개념 전달용 그라디언트임을 전제로 함(계획의 스코프 제외 항목 참고).
const SPECTRUM_STOPS: [nm: number, color: string][] = [
  [400, '#7f00ff'],
  [450, '#3f2bff'],
  [490, '#00c8e0'],
  [510, '#22c55e'],
  [570, '#f5e500'],
  [590, '#ff9500'],
  [620, '#ff2200'],
  [700, '#5c0000'],
]

const SPECTRUM_MIN_NM = 400
const SPECTRUM_MAX_NM = 700
const SPECTRUM_WIDTH = 260
const SPECTRUM_HEIGHT = 22
const SPECTRUM_X = 60
const SPECTRUM_Y = 58

const DELTA_BAR_X = 20
const DELTA_BAR_MAX_HEIGHT = 60
const DELTA_BAR_BASE_Y = 176
const DELTA_BAR_WIDTH = 22

function nmToX(nm: number) {
  const clamped = Math.min(Math.max(nm, SPECTRUM_MIN_NM), SPECTRUM_MAX_NM)
  return SPECTRUM_X + ((clamped - SPECTRUM_MIN_NM) / (SPECTRUM_MAX_NM - SPECTRUM_MIN_NM)) * SPECTRUM_WIDTH
}

/** 흡수 밴드의 마스크 폭(px)을 skew에 따라 좌/우 비대칭으로 계산 */
function maskExtent(band: AbsorptionBand) {
  const pxPerNm = SPECTRUM_WIDTH / (SPECTRUM_MAX_NM - SPECTRUM_MIN_NM)
  const halfWidthNm = band.fwhmNm / 2
  const leftFrac = band.skew === 'broadTowardShorter' ? 0.65 : band.skew === 'broadTowardLonger' ? 0.35 : 0.5
  const rightFrac = 1 - leftFrac
  return {
    leftPx: halfWidthNm * 2 * leftFrac * pxPerNm,
    rightPx: halfWidthNm * 2 * rightFrac * pxPerNm,
  }
}

export default function CrystalFieldDiagram({
  dOrbitalGroups,
  observedColor,
  deltaWavenumber_cm1,
  maxDeltaWavenumber_cm1,
  absorptionBand,
}: CrystalFieldDiagramProps) {
  const groupCount = dOrbitalGroups.length
  const topGroupIndex = groupCount - 1
  const secondTopGroupIndex = groupCount - 2

  const gradientId = `cf-spectrum-${absorptionBand.peakNm}`
  const peakX = nmToX(absorptionBand.peakNm)
  const { leftPx, rightPx } = maskExtent(absorptionBand)
  const barHeight = Math.max(6, (deltaWavenumber_cm1 / maxDeltaWavenumber_cm1) * DELTA_BAR_MAX_HEIGHT)
  const barTopY = DELTA_BAR_BASE_Y - barHeight

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* 오비탈 갈라짐 패턴 (갈라지는 준위 개수·모양) */}
      <svg
        viewBox={`0 0 ${SPLIT_WIDTH} ${SPLIT_HEIGHT}`}
        width={SPLIT_WIDTH}
        height={SPLIT_HEIGHT}
        role="img"
        aria-label="d 오비탈 에너지 준위 갈라짐 다이어그램"
      >
        {dOrbitalGroups.map((lineCount, groupIndex) => {
          const y = SPLIT_BASE_Y - groupIndex * GROUP_SPACING
          const totalWidth = (lineCount - 1) * (LINE_LENGTH + LINE_GAP) + LINE_LENGTH
          const startX = (SPLIT_WIDTH - totalWidth) / 2 + 20
          return (
            <g key={groupIndex}>
              {Array.from({ length: lineCount }, (_, lineIndex) => {
                const x = startX + lineIndex * (LINE_LENGTH + LINE_GAP)
                return (
                  <line
                    key={lineIndex}
                    x1={x}
                    y1={y}
                    x2={x + LINE_LENGTH}
                    y2={y}
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                  />
                )
              })}
            </g>
          )
        })}

        {groupCount >= 2 && (
          <g>
            <line
              x1={12}
              y1={SPLIT_BASE_Y - secondTopGroupIndex * GROUP_SPACING}
              x2={12}
              y2={SPLIT_BASE_Y - topGroupIndex * GROUP_SPACING}
              stroke="var(--color-text-muted)"
              strokeWidth={1}
              markerStart="url(#cf-arrow)"
              markerEnd="url(#cf-arrow)"
            />
            <text
              x={0}
              y={SPLIT_BASE_Y - ((secondTopGroupIndex + topGroupIndex) / 2) * GROUP_SPACING + 4}
              fontSize={11}
              fill="var(--color-text-muted)"
            >
              Δ
            </text>
          </g>
        )}

        <defs>
          <marker id="cf-arrow" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--color-text-muted)" />
          </marker>
        </defs>
      </svg>

      {/* Δ(수치) → 흡수 파장 → 관찰색 인과 사슬 */}
      <svg
        viewBox="0 0 340 200"
        width={340}
        height={200}
        role="img"
        aria-label="결정장 갈라짐 에너지가 흡수 파장을 거쳐 관찰색으로 이어지는 다이어그램"
      >
        {/* Δ 막대 (화합물 간 공유 스케일로 비교 가능) */}
        <rect
          x={DELTA_BAR_X}
          y={barTopY}
          width={DELTA_BAR_WIDTH}
          height={barHeight}
          fill="var(--color-accent)"
          opacity={0.85}
          rx={2}
        />
        <text x={DELTA_BAR_X + DELTA_BAR_WIDTH / 2} y={DELTA_BAR_BASE_Y + 14} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)">
          Δ
        </text>
        <text x={DELTA_BAR_X + DELTA_BAR_WIDTH / 2} y={barTopY - 8} fontSize={9.5} textAnchor="middle" fill="var(--color-text-secondary)">
          {deltaWavenumber_cm1.toLocaleString()}cm⁻¹
        </text>

        {/* Δ 막대 → 스펙트럼 위치 연결선 */}
        <line
          x1={DELTA_BAR_X + DELTA_BAR_WIDTH}
          y1={barTopY}
          x2={peakX}
          y2={SPECTRUM_Y}
          stroke="var(--color-text-muted)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />

        {/* 가시광선 스펙트럼 띠 */}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            {SPECTRUM_STOPS.map(([nm, color]) => (
              <stop key={nm} offset={(nm - SPECTRUM_MIN_NM) / (SPECTRUM_MAX_NM - SPECTRUM_MIN_NM)} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <text x={SPECTRUM_X} y={SPECTRUM_Y - 8} fontSize={8.5} fill="var(--color-text-muted)">
          400nm
        </text>
        <text x={SPECTRUM_X + SPECTRUM_WIDTH} y={SPECTRUM_Y - 8} fontSize={8.5} textAnchor="end" fill="var(--color-text-muted)">
          700nm
        </text>
        <rect
          x={SPECTRUM_X}
          y={SPECTRUM_Y}
          width={SPECTRUM_WIDTH}
          height={SPECTRUM_HEIGHT}
          fill={`url(#${gradientId})`}
          rx={3}
        />
        {/* 흡수된(먹힌) 구간 — 폭·비대칭성을 실제 밴드 모양대로, 뚜렷하게 어둡게 마스킹 */}
        <rect
          x={peakX - leftPx}
          y={SPECTRUM_Y}
          width={leftPx + rightPx}
          height={SPECTRUM_HEIGHT}
          fill="#000000"
          opacity={0.72}
          stroke="var(--color-text-muted)"
          strokeWidth={0.75}
          rx={3}
        />
        <text
          x={peakX}
          y={SPECTRUM_Y + SPECTRUM_HEIGHT + 16}
          fontSize={9.5}
          textAnchor="middle"
          fill="var(--color-text-secondary)"
        >
          {absorptionBand.peakNm}nm 흡수
        </text>

        {/* 마스킹된 구간 → 관찰색 도출 화살표 (라벨은 화살표 아래 별도 줄) */}
        <line
          x1={peakX}
          y1={SPECTRUM_Y + SPECTRUM_HEIGHT + 22}
          x2={peakX}
          y2={SPECTRUM_Y + SPECTRUM_HEIGHT + 44}
          stroke="var(--color-text-muted)"
          strokeWidth={1}
          markerEnd="url(#cf-down-arrow)"
        />
        <text
          x={peakX}
          y={SPECTRUM_Y + SPECTRUM_HEIGHT + 58}
          fontSize={9}
          textAnchor="middle"
          fill="var(--color-text-muted)"
        >
          나머지 파장의 합 → 보색
        </text>
        <circle
          cx={peakX}
          cy={SPECTRUM_Y + SPECTRUM_HEIGHT + 80}
          r={12}
          fill={observedColor.hex}
          stroke="var(--color-border-card-strong)"
        />

        <defs>
          <marker id="cf-down-arrow" markerWidth={6} markerHeight={6} refX={3} refY={5} orient="auto">
            <path d="M0,0 L6,0 L3,6 z" fill="var(--color-text-muted)" />
          </marker>
        </defs>
      </svg>

      <div className="flex flex-col items-center gap-1.5">
        <div
          className="h-12 w-12 rounded-full border"
          style={{ background: observedColor.hex, borderColor: 'var(--color-border-card-strong)' }}
        />
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {observedColor.label}
        </span>
      </div>
    </div>
  )
}
