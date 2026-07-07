function RecipeCard({ rank, name, emoji, totalCost }) {
  return (
    <li className="relative flex flex-col items-center gap-1 rounded-xl border border-orange-100 bg-white p-3 text-center shadow-sm transition hover:border-orange-300 hover:shadow-md">
      <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
        {rank}
      </span>
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <p className="w-full truncate text-sm font-medium text-gray-800">{name}</p>
      <p className="text-sm font-bold text-orange-600">
        {totalCost.toLocaleString()}원
      </p>
    </li>
  )
}

export default RecipeCard
