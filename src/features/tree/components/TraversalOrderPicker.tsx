import type { TraversalOrder } from '../types'

interface TraversalOrderPickerProps {
  activeOrder: TraversalOrder
  onSelect: (order: TraversalOrder) => void
}

const ORDERS: { id: TraversalOrder; label: string }[] = [
  { id: 'preorder', label: '전위' },
  { id: 'inorder', label: '중위' },
  { id: 'postorder', label: '후위' },
  { id: 'levelorder', label: '레벨' },
]

export default function TraversalOrderPicker({ activeOrder, onSelect }: TraversalOrderPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ORDERS.map((order) => (
        <button
          key={order.id}
          onClick={() => onSelect(order.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeOrder === order.id
              ? 'border border-violet-400 bg-violet-400/15 text-violet-300'
              : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          {order.label}
        </button>
      ))}
    </div>
  )
}
