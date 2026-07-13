import { useEffect, useState } from 'react'

// 냉장고에서 고른 재료(ownedNames)는 "보유"로, 나머지는 "구매 필요"로 배지를 붙이고 구매 필요를 먼저 보여준다.
// 체크박스는 구매 필요 기본 체크 / 보유 기본 해제 — 보유 재료도 다시 살 거면 직접 체크할 수 있다(해제된 행은 흐리게 표시).
function IngredientList({ ingredients, ownedNames = [], selectedName, onSelect }) {
  const sorted = [...ingredients].sort((a, b) => {
    const aOwned = ownedNames.includes(a.name)
    const bOwned = ownedNames.includes(b.name)
    return aOwned === bOwned ? 0 : aOwned ? 1 : -1
  })

  const [checkedNames, setCheckedNames] = useState(
    () => new Set(ingredients.filter((ingredient) => !ownedNames.includes(ingredient.name)).map((ingredient) => ingredient.name)),
  )

  useEffect(() => {
    setCheckedNames(
      new Set(ingredients.filter((ingredient) => !ownedNames.includes(ingredient.name)).map((ingredient) => ingredient.name)),
    )
  }, [ingredients, ownedNames])

  function toggleChecked(name) {
    setCheckedNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((ingredient) => {
        const isSelected = ingredient.name === selectedName
        const isOwned = ownedNames.includes(ingredient.name)
        const isChecked = checkedNames.has(ingredient.name)
        return (
          <li key={ingredient.name}>
            <button
              type="button"
              onClick={() => onSelect(ingredient)}
              className={`flex w-full items-center gap-3 rounded-card border p-3 text-left transition ${
                isSelected ? 'border-primary bg-primary-soft' : 'border-border bg-bg-surface hover:border-primary'
              } ${isChecked ? '' : 'opacity-60'}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onClick={(event) => event.stopPropagation()}
                onChange={() => toggleChecked(ingredient.name)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span className="flex flex-1 items-center gap-2">
                <span className="font-medium text-text-primary">{ingredient.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isOwned ? 'bg-bg-muted text-text-secondary' : 'bg-primary-soft text-primary-text'
                  }`}
                >
                  {isOwned ? '보유' : '구매 필요'}
                </span>
              </span>
              <span className="text-sm text-text-secondary">{ingredient.amount}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default IngredientList
