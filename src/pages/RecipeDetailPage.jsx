import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fridgeIngredients } from '../data/fridgeIngredients'
import { loadFridgeSelection } from '../data/fridgeStorage'
import { buildNaverSearchUrl, buildCoupangSearchUrl } from '../utils/purchaseLinks'
import IngredientList from '../components/IngredientList'
import PurchaseLinkPanel from '../components/PurchaseLinkPanel'
import Thumbnail from '../components/Thumbnail'

// prototype/recipe-*.html의 video-block + detail-grid + summary-card 구조를 그대로 포팅.
function RecipeDetailPage() {
  const { recipeId } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState(null)

  useEffect(() => {
    setRecipe(null)
    setNotFound(false)
    setSelectedIngredient(null)

    fetch(`/api/recipes/${recipeId}`)
      .then((res) => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then((data) => setRecipe(data.recipe))
      .catch(() => setNotFound(true))
  }, [recipeId])

  if (notFound) {
    return (
      <main className="min-h-screen bg-bg-page px-4 py-10 text-center text-text-secondary">
        요리를 찾을 수 없어요.{' '}
        <Link to="/home" className="text-primary-text underline">
          홈으로
        </Link>
      </main>
    )
  }

  if (!recipe) {
    return <main className="min-h-screen bg-bg-page px-4 py-10 text-center text-text-secondary">불러오는 중...</main>
  }

  const selectedIds = loadFridgeSelection()
  // Home.jsx의 추천 매칭과 달리 여기는 조미료(category: 'seasoning')도 그대로 포함한다 —
  // 보유/구매 필요 표시는 재료 하나하나의 정확도가 중요해서 조미료를 빼면 안 됨.
  const ownedNames = fridgeIngredients
    .filter((ingredient) => selectedIds.includes(ingredient.id))
    .flatMap((ingredient) => ingredient.matchNames)

  return (
    <main className="min-h-screen bg-bg-page px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/home" className="text-sm text-text-secondary hover:text-primary-text">
          ← 홈으로
        </Link>

        {/* video-block 히어로 */}
        <div className="relative mt-4 flex items-center gap-5 rounded-banner bg-primary-soft p-6">
          <div className="relative aspect-video w-44 shrink-0 overflow-hidden rounded-card sm:w-48">
            <Thumbnail image={recipe.image} emoji={recipe.emoji} alt={recipe.name} className="h-full w-full text-4xl" />
            {recipe.youtubeId && (
              <a
                href={`https://www.youtube.com/watch?v=${recipe.youtubeId}`}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-surface pl-0.5 text-sm text-text-primary shadow">
                  ▶
                </span>
              </a>
            )}
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wide text-primary-text uppercase opacity-70">유튜브 만드는 법</p>
            <p className="mt-1.5 text-xl font-bold text-text-primary">
              {recipe.name} · {recipe.servings}인분
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="border-b border-border pb-2 text-[11px] font-bold tracking-wide text-text-secondary uppercase">
              재료 · 필요량 · 참고 구매가
            </h2>
            <div className="mt-3">
              <IngredientList
                ingredients={recipe.ingredients}
                ownedNames={ownedNames}
                selectedName={selectedIngredient?.name}
                onSelect={setSelectedIngredient}
              />
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <span className="text-sm text-text-secondary">1인분 총 재료비</span>
              <span className="text-2xl font-bold text-text-primary">{recipe.totalCost.toLocaleString()}원</span>
            </div>
          </div>

          <aside className="flex flex-col gap-4 md:sticky md:top-10">
            <div className="rounded-card border border-border bg-bg-surface p-4">
              <p className="text-sm text-text-secondary">
                "구매 필요" 재료는 기본으로 체크돼 있어요. 보유 재료도 다시 살 거면 체크하세요.
              </p>
              <a
                href={buildNaverSearchUrl(`${recipe.name} 재료`)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-full bg-primary px-4 py-3 text-center text-sm font-bold text-text-primary transition hover:brightness-95"
              >
                네이버에서 한번에 구매
              </a>
              <a
                href={buildCoupangSearchUrl(`${recipe.name} 재료`)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block rounded-full border border-border px-4 py-3 text-center text-sm font-medium text-text-primary transition hover:bg-bg-muted"
              >
                쿠팡에서 한번에 구매
              </a>
            </div>

            <PurchaseLinkPanel ingredient={selectedIngredient} />
          </aside>
        </div>

        <p className="mt-4 text-xs text-text-secondary">KAMIS 평균 시세를 나타내어 평균보다 싼지 비싼지 나타냅니다.</p>
      </div>
    </main>
  )
}

export default RecipeDetailPage
