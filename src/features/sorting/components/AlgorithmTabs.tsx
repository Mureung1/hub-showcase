import type { SortAlgorithm } from '../data/algorithms'

interface AlgorithmTabsProps {
  algorithms: SortAlgorithm[]
  activeId: string
  onSelect: (id: string) => void
}

export default function AlgorithmTabs({ algorithms, activeId, onSelect }: AlgorithmTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {algorithms.map((algorithm) => (
        <button
          key={algorithm.id}
          onClick={() => onSelect(algorithm.id)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeId === algorithm.id
              ? 'bg-cyan-400 text-zinc-950'
              : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {algorithm.name}
        </button>
      ))}
    </div>
  )
}
