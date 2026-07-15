import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mockRecipes } from '../data/mockRecipes'
import { sortByCost, groupRecipesByMissingIngredients } from '../data/selectors'
import { fridgeIngredients, SEASONING_MATCH_NAMES } from '../data/fridgeIngredients'
import { loadFridgeSelection } from '../data/fridgeStorage'
import MenuCard from '../components/MenuCard'
import PromoBanner from '../components/PromoBanner'
import mascotWave from '../assets/mascot-wave.png'

// 프로토타입(prototype/home.html) 구조를 그대로 포팅: 네비바 → 프로모 배너 → 냉장고 재료 추천 → 전체 둘러보기(평면 리스트).
// 카테고리별(메인음식/반찬/간식) 미리보기 섹션은 이 구조로 대체됨 — TypePage/CategoryPage 자체는 남아있지만 홈에서 링크하지 않음.
const allRecipesByPrice = sortByCost(mockRecipes)
const cheapestId = allRecipesByPrice[0]?.id

function Home() {
  const [readyRecipes, setReadyRecipes] = useState([])
  const [shoppingRecipes, setShoppingRecipes] = useState([])

  useEffect(() => {
    const selectedIds = loadFridgeSelection()
    // 조미료(category: 'seasoning')는 거의 모든 레시피에 들어가 있어서 추천 매칭에 포함시키면
    // 실제로 가진 재료와 상관없이 추천 목록이 부풀려진다 — fridgeIngredients.js 상단 주석 참고.
    const ownedMatchNames = fridgeIngredients
      .filter((ingredient) => selectedIds.includes(ingredient.id) && ingredient.category !== 'seasoning')
      .flatMap((ingredient) => ingredient.matchNames)

    if (ownedMatchNames.length === 0) {
      setReadyRecipes([])
      setShoppingRecipes([])
      return
    }

    fetch(`/api/recipes?matchNames=${ownedMatchNames.join(',')}`)
      .then((res) => res.json())
      .then((data) => {
        const { ready, shopping } = groupRecipesByMissingIngredients(
          data.recipes ?? [],
          ownedMatchNames,
          SEASONING_MATCH_NAMES,
        )
        setReadyRecipes(ready)
        setShoppingRecipes(shopping)
      })
      .catch(() => {
        setReadyRecipes([])
        setShoppingRecipes([])
      })
  }, [])

  return (
    <div className="min-h-screen bg-bg-cream">
      <nav className="sticky top-0 z-10 border-b border-border bg-bg-cream select-none">
        <div className="mx-auto max-w-[960px] px-8 py-5" />
      </nav>

      <main className="mx-auto max-w-[960px] pb-8">
        <PromoBanner />

        <div className="mt-6 flex items-baseline justify-between px-8">
          <h2 className="text-sm font-bold text-text-primary">냉장고 재료로 만들 수 있는 요리</h2>
          <Link to="/" className="text-xs text-text-secondary underline hover:text-text-primary">
            재료 다시 고르기 →
          </Link>
        </div>

        {readyRecipes.length === 0 && shoppingRecipes.length === 0 && (
          <p className="mt-2 px-8 text-xs text-text-secondary">
            아직 고른 재료로 만들 수 있는 요리를 못 찾았어요. 조미료 말고 실제 재료(채소·고기·가공식품 등)를 골라보세요.
          </p>
        )}

        {readyRecipes.length > 0 && (
          <section className="mt-2 px-8">
            <h3 className="text-xs font-bold text-text-secondary">지금 바로 만들 수 있어요</h3>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute -left-[108px] top-9 z-10 hidden sm:block">
                <span className="absolute left-2 -top-6 whitespace-nowrap rounded-full border border-border bg-bg-surface px-3 py-1 text-xs font-bold text-primary-text shadow-sm">
                  끼니 픽!
                </span>
                <img src={mascotWave} alt="" className="w-32 select-none" />
              </div>
              <ol className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
                {readyRecipes.map((recipe) => (
                  <MenuCard
                    key={recipe.id}
                    to={`/recipe/${recipe.id}`}
                    image={recipe.image}
                    emoji={recipe.emoji}
                    name={recipe.name}
                    price={recipe.totalCost}
                    priceSuffix="원"
                    bestTag={recipe.id === cheapestId}
                  />
                ))}
              </ol>
            </div>
          </section>
        )}

        {shoppingRecipes.length > 0 && (
          <section className="mt-6 px-8">
            <h3 className="text-xs font-bold text-text-secondary">재료 조금만 사면 돼요</h3>
            <ol className="mt-2 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
              {shoppingRecipes.map((recipe) => (
                <MenuCard
                  key={recipe.id}
                  to={`/recipe/${recipe.id}`}
                  image={recipe.image}
                  emoji={recipe.emoji}
                  name={recipe.name}
                  price={recipe.totalCost}
                  priceSuffix="원"
                  bestTag={recipe.id === cheapestId}
                  missingCount={recipe.missingCount}
                />
              ))}
            </ol>
          </section>
        )}

        <h2 className="mt-8 px-8 text-sm font-bold text-text-primary">전체 둘러보기</h2>
        <ol className="mt-2 grid grid-cols-3 gap-3 px-8 max-[640px]:grid-cols-1">
          {allRecipesByPrice.map((recipe) => (
            <MenuCard
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              image={recipe.image}
              emoji={recipe.emoji}
              name={recipe.name}
              price={recipe.totalCost}
              priceSuffix="원"
              bestTag={recipe.id === cheapestId}
            />
          ))}
        </ol>
      </main>
    </div>
  )
}

export default Home
