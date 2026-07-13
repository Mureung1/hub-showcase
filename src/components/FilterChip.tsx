import './FilterChip.css'

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

/** 와이어프레임 `.home-chip` — 홈 정렬 필터 */
export default function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      className={active ? 'home-chip active' : 'home-chip'}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
