import { useEffect, useState } from 'react'

// 냉장고에서 고른 재료(ownedNames)는 "있는 재료" 카드에, 나머지는 "없는 재료" 카드에 나뉘어 들어가므로
// (RecipeDetailPage.jsx) 행 안에 따로 배지를 붙이지 않는다 — 없는 재료를 먼저 보여준다.
// 체크박스는 없는 재료 기본 체크 / 있는 재료 기본 해제 — 있는 재료도 다시 살 거면 직접 체크할 수 있다(해제된 행은 흐리게 표시).
// 재료를 클릭하면 아래 PurchaseLinkPanel에 실제 최저가·링크가 뜨므로 행 안에 별도 네이버 링크는 두지 않는다.
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
              <span className="flex-1 font-medium text-text-primary">{ingredient.name}</span>
              <span className="shrink-0 text-sm text-text-secondary">{ingredient.amount}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default IngredientList
