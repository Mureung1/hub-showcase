import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mockRecipes } from '../data/mockRecipes'
import IngredientList from '../components/IngredientList'
import PurchaseLinkPanel from '../components/PurchaseLinkPanel'

function RecipeDetailPage() {
  const { recipeId } = useParams()
  const recipe = mockRecipes.find((item) => item.id === recipeId)
  const [selectedIngredient, setSelectedIngredient] = useState(null)

  if (!recipe) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 text-center text-gray-500">
        요리를 찾을 수 없어요.{' '}
        <Link to="/" className="text-orange-600 underline">
          홈으로
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to={`/category/${recipe.categoryId}`} className="text-sm text-gray-500 hover:text-orange-600">
          ← 목록으로
        </Link>

        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex-1">
            {recipe.image ? (
              <img
                src={recipe.image}
                alt={recipe.name}
                className="aspect-video w-full rounded-xl object-cover"
              />
            ) : (
              <span
                className="flex aspect-video w-full items-center justify-center rounded-xl bg-orange-50 text-6xl"
                aria-hidden="true"
              >
                {recipe.emoji}
              </span>
            )}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
                <p className="text-lg font-extrabold text-orange-600">
                  1인분 · {recipe.totalCost.toLocaleString()}원
                </p>
              </div>
              {recipe.youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${recipe.youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
                >
                  ▶ 만드는 법 보기
                </a>
              )}
            </div>

            <h2 className="mt-6 mb-2 text-sm font-semibold text-gray-600">재료</h2>
            <IngredientList
              ingredients={recipe.ingredients}
              selectedName={selectedIngredient?.name}
              onSelect={setSelectedIngredient}
            />
          </div>

          <aside className="w-full shrink-0 md:sticky md:top-10 md:w-64">
            <PurchaseLinkPanel ingredient={selectedIngredient} />
          </aside>
        </div>
      </div>
    </main>
  )
}

export default RecipeDetailPage
