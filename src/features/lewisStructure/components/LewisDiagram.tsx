import type { AtomId, LewisStep } from '../data/types'

interface LewisDiagramProps {
  step: LewisStep
}

const WIDTH = 300
const HEIGHT = 220
const BOND_GAP = 14
const LONE_PAIR_DISTANCE = 22
const DOT_OFFSET = 4

const DIRECTIONS = [
  { name: 'up', dx: 0, dy: -1 },
  { name: 'right', dx: 1, dy: 0 },
  { name: 'down', dx: 0, dy: 1 },
  { name: 'left', dx: -1, dy: 0 },
]

function closestDirection(dx: number, dy: number) {
  const len = Math.hypot(dx, dy) || 1
  const nx = dx / len
  const ny = dy / len
  let best = DIRECTIONS[0]
  let bestDot = -Infinity
  for (const dir of DIRECTIONS) {
    const dot = nx * dir.dx + ny * dir.dy
    if (dot > bestDot) {
      bestDot = dot
      best = dir
    }
  }
  return best.name
}

export default function LewisDiagram({ step }: LewisDiagramProps) {
  const atomById = new Map(step.atoms.map((a) => [a.id, a]))
  const occupied: Record<AtomId, Set<string>> = {}
  step.atoms.forEach((a) => (occupied[a.id] = new Set()))
  step.bonds.forEach((bond) => {
    const a = atomById.get(bond.a)
    const b = atomById.get(bond.b)
    if (!a || !b) return
    occupied[a.id].add(closestDirection(b.x - a.x, b.y - a.y))
    occupied[b.id].add(closestDirection(a.x - b.x, a.y - b.y))
  })

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      role="img"
      aria-label="루이스 구조 다이어그램"
    >
      {step.bonds.map((bond, i) => {
        const a = atomById.get(bond.a)
        const b = atomById.get(bond.b)
        if (!a || !b) return null
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        const x1 = a.x + ux * BOND_GAP
        const y1 = a.y + uy * BOND_GAP
        const x2 = b.x - ux * BOND_GAP
        const y2 = b.y - uy * BOND_GAP
        const perpX = -uy
        const perpY = ux
        const offsets = bond.order === 1 ? [0] : bond.order === 2 ? [-3, 3] : [-5, 0, 5]
        return (
          <g key={i}>
            {offsets.map((offset, j) => (
              <line
                key={j}
                x1={x1 + perpX * offset}
                y1={y1 + perpY * offset}
                x2={x2 + perpX * offset}
                y2={y2 + perpY * offset}
                stroke="var(--color-text-primary)"
                strokeWidth={1.75}
              />
            ))}
          </g>
        )
      })}

      {step.atoms.map((atom) => {
        const lonePairCount = step.lonePairs[atom.id] ?? 0
        const usedDirections = occupied[atom.id] ?? new Set()
        const availableDirections = DIRECTIONS.filter((d) => !usedDirections.has(d.name))
        const dotGroups = []
        for (let i = 0; i < lonePairCount && i < availableDirections.length; i++) {
          const dir = availableDirections[i]
          const cx = atom.x + dir.dx * LONE_PAIR_DISTANCE
          const cy = atom.y + dir.dy * LONE_PAIR_DISTANCE
          const perpX = -dir.dy
          const perpY = dir.dx
          dotGroups.push(
            <g key={dir.name}>
              <circle cx={cx + perpX * DOT_OFFSET} cy={cy + perpY * DOT_OFFSET} r={2} fill="var(--color-accent)" />
              <circle cx={cx - perpX * DOT_OFFSET} cy={cy - perpY * DOT_OFFSET} r={2} fill="var(--color-accent)" />
            </g>,
          )
        }
        return (
          <g key={atom.id}>
            {dotGroups}
            <text
              x={atom.x}
              y={atom.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={20}
              fontWeight={500}
              fill="var(--color-text-primary)"
            >
              {atom.symbol}
            </text>
            {atom.charge !== undefined && atom.charge !== 0 && (
              <text x={atom.x + 14} y={atom.y - 12} fontSize={11} fill="#f472b6">
                {atom.charge > 0 ? `${atom.charge}+` : `${Math.abs(atom.charge)}-`}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
