import { useState } from 'react'
import { Link } from 'react-router-dom'

function RecipeCard({ id, rank, name, image, emoji, totalCost }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(image) && !imageFailed

  return (
    <li>
      <Link
        to={`/recipe/${id}`}
        className="relative flex flex-col overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm transition hover:border-orange-300 hover:shadow-md"
      >
        <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-orange-600 shadow">
          {rank}
        </span>
        {showImage ? (
          <img
            src={image}
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
            {totalCost.toLocaleString()}원
          </p>
        </div>
      </Link>
    </li>
  )
}

export default RecipeCard
