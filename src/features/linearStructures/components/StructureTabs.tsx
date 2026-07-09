import type { StructureType } from '../types'

interface StructureTabsProps {
  activeType: StructureType
  onSelect: (type: StructureType) => void
}

const TABS: { id: StructureType; label: string }[] = [
  { id: 'stack', label: '스택' },
  { id: 'queue', label: '큐' },
  { id: 'deque', label: '덱' },
]

export default function StructureTabs({ activeType, onSelect }: StructureTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeType === tab.id
              ? 'bg-cyan-400 text-zinc-950'
              : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
