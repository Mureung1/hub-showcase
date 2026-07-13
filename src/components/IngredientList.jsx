function IngredientList({ ingredients, selectedName, onSelect }) {
  return (
    <ul className="flex flex-col gap-2">
      {ingredients.map((ingredient) => {
        const isSelected = ingredient.name === selectedName
        return (
          <li key={ingredient.name}>
            <button
              type="button"
              onClick={() => onSelect(ingredient)}
              className={`flex w-full items-center justify-between rounded-card border p-3 text-left transition ${
                isSelected
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-bg-surface hover:border-primary'
              }`}
            >
              <span className="font-medium text-text-primary">{ingredient.name}</span>
              <span className="text-sm text-text-secondary">{ingredient.amount}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default IngredientList
