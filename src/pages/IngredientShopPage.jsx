import { useEffect, useState } from 'react'
import { fridgeIngredients, INGREDIENT_CATEGORIES } from '../data/fridgeIngredients'
import { getFridgeIngredientsByCategory } from '../data/selectors'
import { fetchNaverProducts } from '../utils/purchaseLinks'
import { PAGE_BACKGROUND_STYLE } from '../utils/pageBackground'
import TopNav from '../components/TopNav'
import FilterChipGroup from '../components/FilterChipGroup'
import IngredientShopCard from '../components/IngredientShopCard'
import PurchaseLinkPanel from '../components/PurchaseLinkPanel'

// 냉장고에 재료가 아예 없는 사용자를 위한 진입점 — 마켓컬리의 "카테고리 랭킹" UI를 참고했지만
// 완성품이 아니라 fridgeIngredients.js의 개별 식재료를 파는 페이지로 각색함.
function IngredientShopPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState(INGREDIENT_CATEGORIES[0].id)
  // 재료 id -> { status: 'loading' | 'done' | 'error', items } — 카테고리 탭을 넘나들어도 캐시 유지
  const [productsByIngredientId, setProductsByIngredientId] = useState({})
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [pickedProducts, setPickedProducts] = useState({})

  const visibleIngredients = getFridgeIngredientsByCategory(fridgeIngredients, selectedCategoryId)

  // 카테고리를 고를 때마다, 아직 조회 안 한 재료만 골라 네이버 최저가를 fetch한다.
  // 카드마다 결과가 오는 대로 독립적으로 반영되도록 Promise.all 없이 하나씩 then/catch를 건다
  // (RecipeDetailPage.handleToggleIngredientPicked와 같은 fetch-then-functional-merge 패턴).
  // 의존성 배열을 selectedCategoryId로만 좁힌 건 의도적 — productsByIngredientId까지 넣으면
  // fetch가 하나 끝날 때마다 이 이펙트가 다시 돌아서 이미 캐시된 재료를 매번 재스캔하게 된다.
  useEffect(() => {
    const idsToFetch = visibleIngredients
      .filter((ingredient) => !productsByIngredientId[ingredient.id])
      .map((ingredient) => ingredient.id)
    if (idsToFetch.length === 0) return

    let cancelled = false
    setProductsByIngredientId((prev) => {
      const next = { ...prev }
      idsToFetch.forEach((id) => {
        next[id] = { status: 'loading', items: [] }
      })
      return next
    })

    idsToFetch.forEach((id) => {
      const ingredient = fridgeIngredients.find((item) => item.id === id)
      fetchNaverProducts(ingredient.label)
        .then((items) => {
          if (cancelled) return
          setProductsByIngredientId((prev) => ({ ...prev, [id]: { status: 'done', items } }))
        })
        .catch(() => {
          if (cancelled) return
          setProductsByIngredientId((prev) => ({ ...prev, [id]: { status: 'error', items: [] } }))
        })
    })

    return () => {
      cancelled = true
    }
  }, [selectedCategoryId])

  function handleTogglePick(ingredientId, product) {
    setPickedProducts((prev) => {
      const next = { ...prev }
      if (next[ingredientId]?.link === product.link) {
        delete next[ingredientId]
      } else {
        next[ingredientId] = product
      }
      return next
    })
  }

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-bg-page px-4 py-8" style={PAGE_BACKGROUND_STYLE}>
        <div className="mx-auto max-w-5xl">
          <h1 className="text-center font-display text-2xl font-bold text-text-primary">재료샵</h1>
          <p className="mt-1 text-center font-display text-sm text-text-secondary">
            필요한 재료만 낱개로, 최저가로 담아보세요
          </p>

          <div className="mt-6">
            <FilterChipGroup options={INGREDIENT_CATEGORIES} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
          </div>

          {visibleIngredients.length > 0 ? (
            <ol className="mt-4 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
              {visibleIngredients.map((ingredient, index) => (
                <IngredientShopCard
                  key={ingredient.id}
                  rank={index + 1}
                  ingredient={ingredient}
                  fetchState={productsByIngredientId[ingredient.id]}
                  isSelected={selectedIngredient?.id === ingredient.id}
                  onCompareClick={setSelectedIngredient}
                />
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-center font-display text-sm text-text-secondary">이 카테고리에는 재료가 없어요.</p>
          )}

          <div className="mt-6">
            <PurchaseLinkPanel
              ingredient={selectedIngredient ? { name: selectedIngredient.label } : null}
              pickedLink={selectedIngredient ? pickedProducts[selectedIngredient.id]?.link : null}
              onTogglePick={(product) => handleTogglePick(selectedIngredient.id, product)}
            />
          </div>
        </div>
      </main>
    </>
  )
}

export default IngredientShopPage
