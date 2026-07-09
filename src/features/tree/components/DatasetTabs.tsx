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
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeId === dataset.id
              ? 'bg-cyan-400 text-zinc-950'
              : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {dataset.name}
        </button>
      ))}
    </div>
  )
}
