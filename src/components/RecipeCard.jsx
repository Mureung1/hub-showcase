import { useState } from 'react'
import { Link } from 'react-router-dom'

function RecipeCard({ id, rank, name, image, emoji, totalCost }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(image) && !imageFailed

  return (
    <li>
      <Link
        to={`/recipe/${id}`}
        className="relative flex flex-col items-center gap-1 rounded-xl border border-orange-100 bg-white p-3 text-center shadow-sm transition hover:border-orange-300 hover:shadow-md"
      >
        <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
          {rank}
        </span>
        {showImage ? (
          <img
            src={image}
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
          {totalCost.toLocaleString()}원
        </p>
      </Link>
    </li>
  )
}

export default RecipeCard
