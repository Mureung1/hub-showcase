import { motion } from 'framer-motion'
import type { AtomIndex, CurlyArrow } from '../data/types'
import { buildArrowPath, getHighlightedAtoms, getLonePairDots } from '../lib/arrowPath'

interface ArrowOverlayProps {
  stepId: string
  arrows: CurlyArrow[]
  atomCoords: Map<AtomIndex, { x: number; y: number }>
}

export default function ArrowOverlay({ stepId, arrows, atomCoords }: ArrowOverlayProps) {
  const highlighted = getHighlightedAtoms(arrows)

  return (
    <>
      <defs>
        <marker
          id="curly-arrowhead"
          viewBox="0 0 7 7"
          markerWidth={5}
          markerHeight={5}
          refX={6}
          refY={3.5}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L7,3.5 L0,7 z" fill="#34d399" />
        </marker>
      </defs>

      {/* 이번 단계에서 실제로 변화가 일어나는 원자(공격하는/받는/떨어지는 원자)를
          라벨 위를 덮지 않는 링으로 감싸서 반응 중심이 눈에 띄게 함 */}
      {highlighted.map((atomIndex) => {
        const pos = atomCoords.get(atomIndex)
        if (!pos) return null
        return (
          <motion.circle
            key={`${stepId}-highlight-${atomIndex}`}
            cx={pos.x}
            cy={pos.y}
            r={12}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={1.3}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.4 }}
          />
        )
      })}

      {arrows.map((arrow) => {
        const d = buildArrowPath(arrow, atomCoords)
        const dots = getLonePairDots(arrow, atomCoords)
        return (
          <g key={`${stepId}-${arrow.id}`}>
            {dots && (
              <>
                <circle cx={dots[0].x} cy={dots[0].y} r={1.4} fill="#f472b6" />
                <circle cx={dots[1].x} cy={dots[1].y} r={1.4} fill="#f472b6" />
              </>
            )}
            {d && (
              <motion.path
                d={d}
                fill="none"
                stroke="#34d399"
                strokeWidth={1.75}
                markerEnd="url(#curly-arrowhead)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
            )}
          </g>
        )
      })}
    </>
  )
}
