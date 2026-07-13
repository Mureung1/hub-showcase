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
    <div
      className="inline-flex gap-1 rounded-[var(--radius-pill)] p-1"
      style={{ background: 'var(--color-bg-page)' }}
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className="rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-medium transition-colors"
          style={
            mode === m.id
              ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' }
              : { color: 'var(--color-text-muted)' }
          }
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
