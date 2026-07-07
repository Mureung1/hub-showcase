function RecipeCard({ rank, name, emoji, totalCost }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3 transition hover:border-purple-500">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-sm font-semibold text-purple-400">
        {rank}
      </span>
      <span className="shrink-0 text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <p className="min-w-0 flex-1 truncate font-medium text-gray-100">{name}</p>
      <p className="shrink-0 whitespace-nowrap font-semibold text-gray-100">
        {totalCost.toLocaleString()}원
      </p>
    </li>
  )
}

export default RecipeCard
