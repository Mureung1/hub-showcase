import { useState } from 'react'
import { Link } from 'react-router-dom'

function CategoryCard({ id, name, emoji, cheapestRecipe }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(cheapestRecipe.image) && !imageFailed

  return (
    <li className="w-32 shrink-0 sm:w-40">
      <Link
        to={`/category/${id}`}
        className="flex flex-col overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm transition hover:border-orange-300 hover:shadow-md"
      >
        {showImage ? (
          <img
            src={cheapestRecipe.image}
            alt={name}
            onError={() => setImageFailed(true)}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <span
            className="flex aspect-square w-full items-center justify-center bg-orange-50 text-4xl"
            aria-hidden="true"
          >
            {emoji}
          </span>
        )}
        <div className="p-3">
          <p className="truncate text-sm font-medium text-gray-700">{name}</p>
          <p className="mt-1 text-lg font-extrabold text-orange-600">
            {cheapestRecipe.totalCost.toLocaleString()}원부터
          </p>
        </div>
      </Link>
    </li>
  )
}

export default CategoryCard
