import { useState } from 'react'
import { Link } from 'react-router-dom'

function CategoryCard({ id, name, emoji, cheapestRecipe }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(cheapestRecipe.image) && !imageFailed

  return (
    <li>
      <Link
        to={`/category/${id}`}
        className="relative flex flex-col items-center gap-1 rounded-xl border border-orange-100 bg-white p-3 text-center shadow-sm transition hover:border-orange-300 hover:shadow-md"
      >
        {showImage ? (
          <img
            src={cheapestRecipe.image}
            alt={name}
            onError={() => setImageFailed(true)}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <span className="text-2xl" aria-hidden="true">
            {emoji}
          </span>
        )}
        <p className="w-full truncate text-sm font-medium text-gray-800">{name}</p>
        <p className="text-sm font-bold text-orange-600">
          {cheapestRecipe.totalCost.toLocaleString()}원부터
        </p>
      </Link>
    </li>
  )
}

export default CategoryCard
