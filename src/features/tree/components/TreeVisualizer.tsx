import type { TreeStep } from '../types'
import type { NodePosition } from '../lib/layout'

interface TreeVisualizerProps {
  step: TreeStep
  positions: Map<number, NodePosition>
  width: number
  height: number
}

const PENDING_BAND = 50

export default function TreeVisualizer({ step, positions, width, height }: TreeVisualizerProps) {
  const highlightEdgeKey = step.highlightEdge ? `${step.highlightEdge[0]}-${step.highlightEdge[1]}` : null
  const visitedSet = new Set(step.visitedNodes)

  const anchorPos =
    step.pendingValue !== undefined && step.pendingAnchor !== undefined
      ? positions.get(step.pendingAnchor)
      : undefined
  const chipPos = anchorPos ? { x: anchorPos.x, y: anchorPos.y - 55 } : undefined

  return (
    <svg
      width={width}
      height={height + PENDING_BAND}
      viewBox={`0 ${-PENDING_BAND} ${width} ${height + PENDING_BAND}`}
      className="mx-auto block"
    >
      {step.builtEdges.map(([a, b]) => {
        const p1 = positions.get(a)
        const p2 = positions.get(b)
        if (!p1 || !p2) return null
        const active = highlightEdgeKey === `${a}-${b}`
        return (
          <line
            key={`${a}-${b}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={active ? '#22d3ee' : '#3f3f46'}
            strokeWidth={active ? 3 : 2}
          />
        )
      })}
      {step.builtNodes.map((value) => {
        const p = positions.get(value)
        if (!p) return null
        const isHighlight = step.highlightNode === value
        const isVisited = visitedSet.has(value)

        let stroke = '#3f3f46'
        let fill = '#27272a'
        let text = '#f4f4f5'
        if (isVisited) {
          stroke = '#34d399'
          fill = 'rgba(52,211,153,0.12)'
          text = '#6ee7b7'
        }
        if (isHighlight) {
          if (step.phase === 'insert') {
            stroke = '#fbbf24'
            fill = 'rgba(251,191,36,0.15)'
            text = '#fde68a'
          } else {
            stroke = '#22d3ee'
            fill = 'rgba(34,211,238,0.18)'
            text = '#67e8f9'
          }
        }

        return (
          <g key={value}>
            <circle cx={p.x} cy={p.y} r={18} fill={fill} stroke={stroke} strokeWidth={2} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={text}>
              {value}
            </text>
          </g>
        )
      })}
      {chipPos && anchorPos && step.pendingValue !== undefined && (
        <>
          <line
            x1={chipPos.x}
            y1={chipPos.y + 16}
            x2={anchorPos.x}
            y2={anchorPos.y - 18}
            stroke="#fbbf24"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <rect
            x={chipPos.x - 35}
            y={chipPos.y + 22}
            width={70}
            height={16}
            rx={3}
            fill="#18181b"
            opacity={0.9}
          />
          <text
            x={chipPos.x}
            y={chipPos.y + 33}
            textAnchor="middle"
            fontSize={11}
            fontWeight={500}
            fill="#fbbf24"
          >
            {step.pendingValue} {step.pendingValue < (step.pendingAnchor as number) ? '<' : '≥'} {step.pendingAnchor}
          </text>
          <circle
            cx={chipPos.x}
            cy={chipPos.y}
            r={16}
            fill="rgba(251,191,36,0.12)"
            stroke="#fbbf24"
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
          <text x={chipPos.x} y={chipPos.y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#fde68a">
            {step.pendingValue}
          </text>
        </>
      )}
    </svg>
  )
}
