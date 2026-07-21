// 이름 pill 칩을 탭해서 재료를 고르는 표시 전용 컴포넌트. 선택 상태는 부모 페이지가 소유한다.
// 칩 스타일은 prototype-v2 fridge-flow의 굵은 잉크 테두리 + 체크 표시 패턴을 그대로 따른다.
function IngredientChipPicker({ options, selectedIds, onToggle }) {
  return (
    <ul className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.id)
        return (
          <li key={option.id}>
            <button
              type="button"
              onClick={(event) => onToggle(option.id, event)}
              aria-pressed={isSelected}
              className={`rounded-full border-[3px] border-ink px-4 py-2 font-display text-lg transition ${
                isSelected ? 'bg-primary text-text-primary' : 'bg-bg-surface text-text-primary'
              }`}
            >
              {isSelected ? `✓ ${option.label}` : option.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default IngredientChipPicker
