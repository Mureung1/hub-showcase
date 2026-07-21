interface CrystalFieldDiagramProps {
  dOrbitalGroups: number[]
  observedColor: { label: string; hex: string }
}

const WIDTH = 220
const HEIGHT = 170
const LINE_LENGTH = 26
const LINE_GAP = 7
const GROUP_SPACING = 44
const BASE_Y = HEIGHT - 24

export default function CrystalFieldDiagram({ dOrbitalGroups, observedColor }: CrystalFieldDiagramProps) {
  const groupCount = dOrbitalGroups.length
  const topGroupIndex = groupCount - 1
  const secondTopGroupIndex = groupCount - 2

  return (
    <div className="flex items-center gap-6">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="d 오비탈 에너지 준위 갈라짐 다이어그램"
      >
        {dOrbitalGroups.map((lineCount, groupIndex) => {
          const y = BASE_Y - groupIndex * GROUP_SPACING
          const totalWidth = (lineCount - 1) * (LINE_LENGTH + LINE_GAP) + LINE_LENGTH
          const startX = (WIDTH - totalWidth) / 2 + 30
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
              x1={20}
              y1={BASE_Y - secondTopGroupIndex * GROUP_SPACING}
              x2={20}
              y2={BASE_Y - topGroupIndex * GROUP_SPACING}
              stroke="var(--color-text-muted)"
              strokeWidth={1}
              markerStart="url(#cf-arrow)"
              markerEnd="url(#cf-arrow)"
            />
            <text
              x={4}
              y={BASE_Y - ((secondTopGroupIndex + topGroupIndex) / 2) * GROUP_SPACING + 4}
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
