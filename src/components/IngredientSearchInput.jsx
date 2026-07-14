import { useState } from 'react'
import { searchIngredients } from '../data/ingredientSearch'

// 재료 검색창 — 타이핑하면 label/matchNames/group(예: "두부"→두부·순두부)에 부분일치하는 칩을 아래에 후보로 보여준다.
// 선택은 부모가 소유한 onSelect(id)로 위임 — FridgePage의 기존 handleToggle을 그대로 재사용한다.
function IngredientSearchInput({ options, onSelect }) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const results = trimmed ? searchIngredients(trimmed, options) : []

  function handleSelect(option, event) {
    onSelect(option.id, event)
    setQuery('')
  }

  return (
    <div>
      <label className="flex h-[42px] items-center gap-2 rounded-input border border-transparent bg-bg-muted px-4 focus-within:border-primary">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-text-secondary">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11.5 11.5L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="재료 검색 (예: 순두부, 삼겹살)"
          autoComplete="off"
          className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
        />
      </label>

      {trimmed && (
        results.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2" data-testid="ingredient-search-results">
            {results.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={(event) => handleSelect(option, event)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-bg-surface px-3 py-1.5 text-sm text-text-primary transition hover:border-primary"
                >
                  <span aria-hidden="true">{option.emoji}</span>
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-text-secondary">검색 결과가 없어요. 다른 이름으로 찾아보세요.</p>
        )
      )}
    </div>
  )
}

export default IngredientSearchInput
