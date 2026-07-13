import { motion } from 'framer-motion'
import type { PseudocodeLine } from '../data/algorithms'

interface CodePanelProps {
  lines: PseudocodeLine[]
  activeLine: number | null
}

export default function CodePanel({ lines, activeLine }: CodePanelProps) {
  return (
    <div className="overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-sm">
      {lines.map((line, index) => (
        <div key={index} className="relative">
          {activeLine === index && (
            <motion.div
              layoutId="code-highlight"
              className="absolute inset-0 rounded bg-emerald-400/10 ring-1 ring-emerald-400/50"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <span
            className={`relative block whitespace-pre px-2 py-0.5 leading-6 ${
              activeLine === index ? 'text-emerald-300' : 'text-zinc-500'
            }`}
            style={{ paddingLeft: `${line.indent * 1.25 + 0.5}rem` }}
          >
            {line.code}
          </span>
        </div>
      ))}
    </div>
  )
}
