// 이모지+이름 pill 칩을 탭해서 재료를 고르는 표시 전용 컴포넌트. 선택 상태는 부모 페이지가 소유한다.
// 칩 스타일은 DESIGN_SYSTEM.md의 filter-chip 패턴(미선택 bg-surface+border, 선택 primary)을 따른다.
function IngredientChipPicker({ options, selectedIds, onToggle }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.id)
        return (
          <li key={option.id}>
            <button
              type="button"
              onClick={(event) => onToggle(option.id, event)}
              aria-pressed={isSelected}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                isSelected
                  ? 'border-primary bg-primary font-semibold text-text-primary'
                  : 'border-border bg-bg-surface text-text-primary hover:border-primary'
              }`}
            >
              <span aria-hidden="true">{option.emoji}</span>
              {option.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default IngredientChipPicker
