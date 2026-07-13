import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mockRecipes } from '../data/mockRecipes'
import IngredientList from '../components/IngredientList'
import PurchaseLinkPanel from '../components/PurchaseLinkPanel'
import Thumbnail from '../components/Thumbnail'

function RecipeDetailPage() {
  const { recipeId } = useParams()
  const recipe = mockRecipes.find((item) => item.id === recipeId)
  const [selectedIngredient, setSelectedIngredient] = useState(null)

  if (!recipe) {
    return (
      <main className="min-h-screen bg-bg-page px-4 py-10 text-center text-text-secondary">
        요리를 찾을 수 없어요.{' '}
        <Link to="/home" className="text-primary-text underline">
          홈으로
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg-page px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to={`/category/${recipe.categoryId}`} className="text-sm text-text-secondary hover:text-primary-text">
          ← 목록으로
        </Link>

        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex-1">
            <Thumbnail
              image={recipe.image}
              emoji={recipe.emoji}
              alt={recipe.name}
              className="aspect-video w-full rounded-card text-6xl"
            />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-text-primary">{recipe.name}</h1>
                <p className="text-lg font-extrabold text-primary-text">
                  1인분 · {recipe.totalCost.toLocaleString()}원
                </p>
              </div>
              {recipe.youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${recipe.youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full border border-border bg-primary-soft px-3 py-2 text-sm font-medium text-primary-text transition hover:brightness-95"
                >
                  ▶ 만드는 법 보기
                </a>
              )}
            </div>

            <h2 className="mt-6 mb-2 text-sm font-semibold text-text-secondary">재료</h2>
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
