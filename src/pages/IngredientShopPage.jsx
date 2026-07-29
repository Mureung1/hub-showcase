import { useEffect, useState } from 'react'
import { fridgeIngredients, INGREDIENT_CATEGORIES } from '../data/fridgeIngredients'
import { getFridgeIngredientsByCategory } from '../data/selectors'
import { fetchNaverProducts } from '../utils/purchaseLinks'
import { loadIngredientProductsCache, saveIngredientProductsCache } from '../data/ingredientProductsCache'
import { PAGE_BACKGROUND_STYLE } from '../utils/pageBackground'
import TopNav from '../components/TopNav'
import FilterChipGroup from '../components/FilterChipGroup'
import IngredientShopCard from '../components/IngredientShopCard'
import PurchaseLinkPanel from '../components/PurchaseLinkPanel'

// 재료 fetch를 이 간격(ms)만큼 순차적으로 지연시켜 보낸다 — 특히 "전체" 탭(65개)처럼 한 번에
// 조회할 재료가 많을 때 네이버 API에 몰리지 않게 하기 위함(429 방지).
const FETCH_STAGGER_MS = 150

// 냉장고에 재료가 아예 없는 사용자를 위한 진입점 — 마켓컬리의 "카테고리 랭킹" UI를 참고했지만
// 완성품이 아니라 fridgeIngredients.js의 개별 식재료를 파는 페이지로 각색함.
function IngredientShopPage() {
  // 기본은 "전체"(null) — 어차피 재료 사진을 불러오면서 시작하니, 처음부터 전체를 보여준다.
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  // 재료 id -> { status: 'loading' | 'done' | 'error', items } — 카테고리 탭을 넘나들어도, 페이지를 다시
  // 방문해도(localStorage) 캐시 유지. 한 번 불러온 재료는 만료 없이 계속 재사용(재조회 안 함).
  const [productsByIngredientId, setProductsByIngredientId] = useState(() => loadIngredientProductsCache())
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [pickedProducts, setPickedProducts] = useState({})

  const visibleIngredients = getFridgeIngredientsByCategory(fridgeIngredients, selectedCategoryId)

  // 카테고리를 고를 때마다, 아직 조회 안 한(캐시에 없는) 재료만 골라 네이버 최저가를 fetch한다.
  // 카드마다 결과가 오는 대로 독립적으로 반영되도록 Promise.all 없이 하나씩 then/catch를 건다
  // (RecipeDetailPage.handleToggleIngredientPicked와 같은 fetch-then-functional-merge 패턴).
  // 다만 "전체" 탭처럼 한 번에 65개를 요청하면 네이버 API가 429를 돌려주므로, FETCH_STAGGER_MS 간격으로
  // 순차적으로 요청을 흘려보낸다(전부 동시에 쏘지 않음).
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

    const timeoutIds = idsToFetch.map((id, index) =>
      setTimeout(() => {
        if (cancelled) return
        const ingredient = fridgeIngredients.find((item) => item.id === id)
        fetchNaverProducts(ingredient.label)
          .then((items) => {
            if (cancelled) return
            setProductsByIngredientId((prev) => {
              const next = { ...prev, [id]: { status: 'done', items } }
              saveIngredientProductsCache(next)
              return next
            })
          })
          .catch(() => {
            if (cancelled) return
            setProductsByIngredientId((prev) => ({ ...prev, [id]: { status: 'error', items: [] } }))
          })
      }, index * FETCH_STAGGER_MS),
    )

    return () => {
      cancelled = true
      timeoutIds.forEach(clearTimeout)
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

          <div className="mt-4 flex flex-col gap-6 md:flex-row-reverse md:items-start">
            <div className="flex-1">
              {visibleIngredients.length > 0 ? (
                <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                <p className="text-center font-display text-sm text-text-secondary">이 카테고리에는 재료가 없어요.</p>
              )}
            </div>

            <div className="md:sticky md:top-8 md:w-80 md:shrink-0">
              <PurchaseLinkPanel
                ingredient={selectedIngredient ? { name: selectedIngredient.label } : null}
                pickedLink={selectedIngredient ? pickedProducts[selectedIngredient.id]?.link : null}
                onTogglePick={(product) => handleTogglePick(selectedIngredient.id, product)}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default IngredientShopPage
