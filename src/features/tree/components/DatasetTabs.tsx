import type { TreeDataset } from '../data/datasets'

interface DatasetTabsProps {
  datasets: TreeDataset[]
  activeId: string
  onSelect: (id: string) => void
}

export default function DatasetTabs({ datasets, activeId, onSelect }: DatasetTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {datasets.map((dataset) => (
        <button
          key={dataset.id}
          onClick={() => onSelect(dataset.id)}
          className="rounded-[var(--radius-pill)] border px-3 py-2 text-sm font-medium transition-colors"
          style={
            activeId === dataset.id
              ? { background: 'var(--color-accent)', color: '#0b0d12', borderColor: 'var(--color-accent)' }
              : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-card-strong)' }
          }
        >
          {dataset.name}
        </button>
      ))}
    </div>
  )
}
