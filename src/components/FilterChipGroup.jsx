// 단일 선택 필터 칩 한 줄. DESIGN_SYSTEM.md의 filter-chip 패턴(미선택 bg-surface+border, 선택 primary)을 따름.
// "전체"를 항상 첫 칩으로 넣어서 선택 해제(null)를 표현 — 음식종류 필터와 시간 필터가 같은 모양이라 하나로 합침.
function FilterChipGroup({ options, selectedId, onSelect }) {
  const allOptions = [{ id: null, label: '전체' }, ...options]
  return (
    <ul className="flex flex-wrap gap-2">
      {allOptions.map((option) => {
        const isSelected = selectedId === option.id
        return (
          <li key={option.id ?? 'all'}>
            <button
              type="button"
              onClick={() => onSelect(option.id)}
              aria-pressed={isSelected}
              className={`rounded-full border-[3.6px] border-ink px-3 py-1.5 font-display text-sm font-bold transition ${
                isSelected
                  ? 'bg-primary font-semibold text-text-primary'
                  : 'bg-bg-surface text-text-secondary hover:bg-primary-soft'
              }`}
            >
              {option.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default FilterChipGroup
