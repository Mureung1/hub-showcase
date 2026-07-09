export type TreeMode = 'insert' | 'traverse'

interface ModeTabsProps {
  mode: TreeMode
  onSelect: (mode: TreeMode) => void
}

const MODES: { id: TreeMode; label: string }[] = [
  { id: 'insert', label: '삽입 과정' },
  { id: 'traverse', label: '순회' },
]

export default function ModeTabs({ mode, onSelect }: ModeTabsProps) {
  return (
    <div className="inline-flex gap-1 rounded-lg bg-zinc-800 p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === m.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
