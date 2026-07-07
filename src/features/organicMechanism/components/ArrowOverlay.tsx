import { motion } from 'framer-motion'
import type { AtomIndex, CurlyArrow } from '../data/types'
import { buildArrowPath } from '../lib/arrowPath'

interface ArrowOverlayProps {
  stepId: string
  arrows: CurlyArrow[]
  atomCoords: Map<AtomIndex, { x: number; y: number }>
}

export default function ArrowOverlay({ stepId, arrows, atomCoords }: ArrowOverlayProps) {
  return (
    <>
      <defs>
        <marker
          id="curly-arrowhead"
          markerWidth={8}
          markerHeight={8}
          refX={6}
          refY={3.5}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L7,3.5 L0,7 z" fill="#34d399" />
        </marker>
      </defs>
      {arrows.map((arrow) => {
        const d = buildArrowPath(arrow, atomCoords)
        if (!d) return null
        return (
          <motion.path
            key={`${stepId}-${arrow.id}`}
            d={d}
            fill="none"
            stroke="#34d399"
            strokeWidth={1.75}
            markerEnd="url(#curly-arrowhead)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        )
      })}
    </>
  )
}
