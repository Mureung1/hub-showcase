import { AnimatePresence, motion, LayoutGroup } from 'framer-motion'
import type { StructureItem, StructureType } from '../types'

interface StructureVisualizerProps {
  items: StructureItem[]
  type: StructureType
}

function isActiveIndex(index: number, length: number, type: StructureType) {
  if (length === 0) return false
  if (type === 'stack') return index === length - 1
  if (type === 'queue') return index === 0
  return index === 0 || index === length - 1
}

export default function StructureVisualizer({ items, type }: StructureVisualizerProps) {
  const vertical = type === 'stack'

  return (
    <LayoutGroup>
      <div
        className={`flex min-h-[56px] flex-wrap items-center justify-center gap-2 ${
          vertical ? 'flex-col-reverse' : 'flex-row'
        }`}
      >
        <AnimatePresence>
          {items.map((item, index) => {
            const active = isActiveIndex(index, items.length, type)
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-200 opacity-40'
                }`}
              >
                {item.value}
              </motion.div>
            )
          })}
        </AnimatePresence>
        {items.length === 0 && <span className="text-sm text-zinc-600">비어 있음</span>}
      </div>
    </LayoutGroup>
  )
}
