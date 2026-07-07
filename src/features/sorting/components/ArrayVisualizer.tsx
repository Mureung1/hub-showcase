import { motion, LayoutGroup } from 'framer-motion'
import type { SortCell } from '../algorithms/types'

interface ArrayVisualizerProps {
  cells: SortCell[]
  comparingIndices: number[]
  swappingIndices: number[]
  sortedIndices: Set<number>
}

function styleFor(
  index: number,
  comparingIndices: number[],
  swappingIndices: number[],
  sortedIndices: Set<number>,
) {
  if (swappingIndices.includes(index)) {
    return 'border-rose-500 bg-rose-500/10 text-rose-400'
  }
  if (comparingIndices.includes(index)) {
    return 'border-amber-400 bg-amber-400/10 text-amber-300'
  }
  if (sortedIndices.has(index)) {
    return 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
  }
  return 'border-zinc-700 bg-zinc-800 text-zinc-200'
}

export default function ArrayVisualizer({
  cells,
  comparingIndices,
  swappingIndices,
  sortedIndices,
}: ArrayVisualizerProps) {
  return (
    <LayoutGroup>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {cells.map((cell, index) => (
          <motion.div
            key={cell.id}
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 text-lg font-semibold transition-colors duration-200 ${styleFor(
              index,
              comparingIndices,
              swappingIndices,
              sortedIndices,
            )}`}
          >
            {cell.value}
          </motion.div>
        ))}
      </div>
    </LayoutGroup>
  )
}
