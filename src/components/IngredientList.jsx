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
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                isSelected
                  ? 'border-orange-400 bg-orange-100'
                  : 'border-orange-100 bg-white hover:border-orange-300'
              }`}
            >
              <span className="font-medium text-gray-800">{ingredient.name}</span>
              <span className="text-sm text-gray-500">{ingredient.amount}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default IngredientList
