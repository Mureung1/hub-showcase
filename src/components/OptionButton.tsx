import './OptionButton.css'

interface OptionButtonProps {
  label: string
  icon?: string
  selected: boolean
  onClick: () => void
}

/**
 * 와이어프레임 `.opt` — 단일/복수 선택 공용 옵션 버튼 (default/hover/selected).
 * 선택 여부를 체크마크로 표시한다 — hover와 selected가 테두리/배경색을 공유해서 색상만으로는
 * 구분이 약했던 문제(복수선택에서 같은 버튼을 다시 눌러 해제할 때 마우스가 그대로 버튼 위에
 * 있으면 hover 스타일이 selected처럼 보여 해제된 게 안 보이던 버그) 대응.
 */
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
      aria-pressed={selected}
      onClick={onClick}
    >
      {icon && <span className="opt-icon">{icon}</span>}
      <span className="opt-label">{label}</span>
      {selected && (
        <span className="opt-check" aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  )
}
