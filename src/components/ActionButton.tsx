import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ActionButtonProps = {
  color: 'green' | 'blue' | 'orange'
  icon: LucideIcon
  label: string
  onClick: () => void
}

export function ActionButton({
  color,
  icon: Icon,
  label,
  onClick,
}: ActionButtonProps) {
  return (
    <button className={`action-card ${color}`} onClick={onClick} type="button">
      <Icon aria-hidden="true" size={34} />
      <span>{label}</span>
      <ChevronRight aria-hidden="true" size={22} />
    </button>
  )
}
