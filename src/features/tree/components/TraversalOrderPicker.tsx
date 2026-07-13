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
          className="rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors"
          style={
            activeOrder === order.id
              ? {
                  borderColor: 'var(--color-secondary-accent)',
                  background: 'var(--color-secondary-accent-fill)',
                  color: '#b3b6fb',
                }
              : { borderColor: 'var(--color-border-card-strong)', color: 'var(--color-text-muted)' }
          }
        >
          {order.label}
        </button>
      ))}
    </div>
  )
}
