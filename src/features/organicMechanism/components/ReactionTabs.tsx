import type { ReactionTemplate } from '../data/types'

interface ReactionTabsProps {
  reactions: ReactionTemplate[]
  activeId: string
  onSelect: (id: string) => void
}

export default function ReactionTabs({ reactions, activeId, onSelect }: ReactionTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {reactions.map((reaction) => (
        <button
          key={reaction.id}
          onClick={() => onSelect(reaction.id)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeId === reaction.id
              ? 'bg-cyan-400 text-zinc-950'
              : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {reaction.name}
        </button>
      ))}
    </div>
  )
}
