import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fridgeIngredients, SEASONING_MATCH_NAMES } from '../data/fridgeIngredients'
import { loadFridgeSelection } from '../data/fridgeStorage'
import { buildNaverSearchUrl, buildCoupangSearchUrl } from '../utils/purchaseLinks'
import IngredientList from '../components/IngredientList'
import PurchaseLinkPanel from '../components/PurchaseLinkPanel'
import Thumbnail from '../components/Thumbnail'
import TopNav from '../components/TopNav'
import mascotWave from '../assets/mascot-wave.png'

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
      <>
        <TopNav />
        <main className="min-h-screen bg-bg-page px-4 py-10 text-center text-text-secondary">
          요리를 찾을 수 없어요.{' '}
          <Link to="/home" className="text-primary-text underline">
            홈으로
          </Link>
        </main>
      </>
    )
  }

  if (!recipe) {
    return (
      <>
        <TopNav />
        <main className="min-h-screen bg-bg-page px-4 py-10 text-center text-text-secondary">불러오는 중...</main>
      </>
    )
  }

  const selectedIds = loadFridgeSelection()
  // Home.jsx의 추천 매칭과 달리 여기는 조미료(category: 'seasoning')도 그대로 포함한다 —
  // 보유/구매 필요 표시는 재료 하나하나의 정확도가 중요해서 조미료를 빼면 안 됨.
  const ownedNames = fridgeIngredients
    .filter((ingredient) => selectedIds.includes(ingredient.id))
    .flatMap((ingredient) => ingredient.matchNames)

  // 홈 화면의 트랙 구분(지금 바로 만들 수 있어요/재료 조금만 사면 돼요)과 같은 기준 — 조미료는 부족 개수에서 제외.
  const missingCount = recipe.ingredients.filter(
    (ingredient) => !SEASONING_MATCH_NAMES.includes(ingredient.name) && !ownedNames.includes(ingredient.name),
  ).length

  const ownedIngredients = recipe.ingredients.filter((ingredient) => ownedNames.includes(ingredient.name))
  const missingIngredients = recipe.ingredients.filter((ingredient) => !ownedNames.includes(ingredient.name))

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-bg-page px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* 히어로 사진 */}
        <div className="relative mt-4 overflow-hidden rounded-banner border-2 border-ink">
          <Thumbnail image={recipe.image} emoji={recipe.emoji} alt={recipe.name} className="aspect-video w-full text-6xl" />
          {recipe.youtubeId && (
            <a
              href={`https://www.youtube.com/watch?v=${recipe.youtubeId}`}
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-bg-surface/90 pl-1 text-xl text-text-primary shadow">
                ▶
              </span>
            </a>
          )}
        </div>

        <div className="mt-5 text-center">
          <h1 className="font-display text-2xl font-bold text-text-primary">{recipe.name}</h1>
          <p className="mt-2 font-display text-sm text-text-secondary">
            {recipe.servings}인분{recipe.cookTimeMinutes ? ` · ${recipe.cookTimeMinutes}분` : ''}
          </p>
          <span className="mt-3 inline-block rounded-full bg-primary-soft px-3 py-1 font-display text-xs font-bold text-primary-text">
            {missingCount === 0 ? '지금 있는 재료로 완성돼요' : `재료 ${missingCount}개만 더 있으면 완성돼요`}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-card border-2 border-ink bg-bg-surface p-4">
            <h2 className="text-center font-display text-base font-bold text-text-primary">보유 재료</h2>
            <div className="mt-3">
              {ownedIngredients.length > 0 ? (
                <IngredientList
                  ingredients={ownedIngredients}
                  ownedNames={ownedNames}
                  selectedName={selectedIngredient?.name}
                  onSelect={setSelectedIngredient}
                />
              ) : (
                <p className="text-center font-display text-sm text-text-secondary">보유한 재료가 없어요.</p>
              )}
            </div>
          </div>

          <div className="rounded-card border-2 border-[#F0B7A8] bg-[#FDEDE9] p-4">
            <h2 className="text-center font-display text-base font-bold text-text-primary">구매 필요 재료</h2>
            <div className="mt-3">
              {missingIngredients.length > 0 ? (
                <IngredientList
                  ingredients={missingIngredients}
                  ownedNames={ownedNames}
                  selectedName={selectedIngredient?.name}
                  onSelect={setSelectedIngredient}
                />
              ) : (
                <p className="text-center font-display text-sm text-text-secondary">구매할 재료가 없어요!</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <PurchaseLinkPanel ingredient={selectedIngredient} />
        </div>

        <div className="mt-6 flex items-end justify-end gap-3">
          <div className="max-w-xs rounded-2xl rounded-br-sm bg-[#FFF3DF] px-4 py-3 font-display text-sm text-text-primary">
            Tip: 재료를 신선하게 준비해두면 더 맛있어요!
          </div>
          <img src={mascotWave} alt="" className="w-14 select-none" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-card border-2 border-ink bg-primary px-5 py-4">
          <div>
            <p className="font-display text-xs text-text-primary">1인분 총 재료비</p>
            <p className="font-display text-2xl font-bold text-text-primary">{recipe.totalCost.toLocaleString()}원</p>
          </div>
          <a
            href={buildNaverSearchUrl(`${recipe.name} 재료`)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border-2 border-ink bg-bg-surface px-5 py-3 font-display text-sm font-bold text-text-primary transition hover:brightness-95"
          >
            🛒 네이버에서 구매
          </a>
        </div>
        <a
          href={buildCoupangSearchUrl(`${recipe.name} 재료`)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-center font-display text-xs text-text-secondary underline hover:text-text-primary"
        >
          쿠팡에서도 검색해보기
        </a>

        <p className="mt-4 text-center font-display text-xs text-text-secondary">
          KAMIS 평균 시세를 나타내어 평균보다 싼지 비싼지 나타냅니다.
        </p>
      </div>
      </main>
    </>
  )
}

export default RecipeDetailPage
