import './OptionButton.css'

interface OptionButtonProps {
  label: string
  icon?: string
  selected: boolean
  onClick: () => void
}

/** 와이어프레임 `.opt` — 단일 선택 옵션 버튼 (default/hover/selected) */
export default function OptionButton({
  label,
  icon,
  selected,
  onClick,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      className={selected ? 'opt selected' : 'opt'}
      onClick={onClick}
    >
      {icon && <span className="opt-icon">{icon}</span>}
      {label}
    </button>
  )
}
