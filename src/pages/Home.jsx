import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mockRecipes } from '../data/mockRecipes'
import { categories, TYPE_LABELS } from '../data/categories'
import { TIME_FILTERS } from '../data/timeFilters'
import {
  sortByCost,
  groupRecipesByMissingIngredients,
  getClosestRecipes,
  getQuickRecipes,
  filterRecipesByType,
  filterRecipesByTimeFilter,
} from '../data/selectors'
import { fridgeIngredients, SEASONING_MATCH_NAMES } from '../data/fridgeIngredients'
import { loadFridgeSelection } from '../data/fridgeStorage'
import { loadLikedRecipes, saveLikedRecipes } from '../data/likedRecipesStorage'
import TopNav from '../components/TopNav'
import MenuCard from '../components/MenuCard'
import PromoBanner from '../components/PromoBanner'
import FilterChipGroup from '../components/FilterChipGroup'
import mascotWave from '../assets/mascot-wave.png'
// 임시 목업 일러스트 — 최종본 아님, 나중에 교체 예정 (checklist.md 참고)
import kkinniCharacter from '../assets/끼니캐릭터.png'
import loadingAnimation from '../assets/로딩-애니메이션.mp4'

const SORT_OPTIONS = [
  { id: 'price-asc', label: '가격 낮은순' },
  { id: 'price-desc', label: '가격 높은순' },
]

// 프로토타입(prototype/home.html) 구조를 그대로 포팅: 네비바 → 프로모 배너 → 냉장고 재료 추천 → 전체 둘러보기(평면 리스트).
// 카테고리별(메인음식/반찬/간식) 미리보기 섹션은 이 구조로 대체됨 — TypePage/CategoryPage 자체는 남아있지만 홈에서 링크하지 않음.
const allRecipesByPrice = sortByCost(mockRecipes)
const cheapestId = allRecipesByPrice[0]?.id

const typeOptions = Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label }))
const timeOptions = TIME_FILTERS.map(({ id, label }) => ({ id, label }))

function Home() {
  const [searchParams] = useSearchParams()
  // 헤더 "로딩" 링크(?loading=1)로 들어오면 fetch 없이 로딩 화면만 계속 보여준다 — 실제 재료를
  // 고르지 않고도 로딩 UI를 바로 확인/작업할 수 있게 하는 개발용 진입점 (checklist.md 범위 아님).
  const forceLoading = searchParams.get('loading') === '1'
  const [readyRecipes, setReadyRecipes] = useState([])
  const [shoppingRecipes, setShoppingRecipes] = useState([])
  const [otherRecipes, setOtherRecipes] = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [selectedTimeFilterId, setSelectedTimeFilterId] = useState(null)
  const [selectedSort, setSelectedSort] = useState(null)
  const [likedIds, setLikedIds] = useState(() => loadLikedRecipes())
  const [showLikedOnly, setShowLikedOnly] = useState(false)
  // 추천 fetch가 아직 안 끝났는지("loading") 구분하는 상태 — 이게 없으면 초기값(빈 배열)과
  // "불러왔는데 결과 없음"이 똑같아 보여서, fetch가 끝나기도 전에 "못 찾았어요" 카드가 먼저 뜬다.
  const [status, setStatus] = useState('loading')

  function handleToggleLike(recipeId) {
    setLikedIds((prev) => {
      const next = prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
      saveLikedRecipes(next)
      return next
    })
  }

  useEffect(() => {
    if (forceLoading) return // status가 초기값 'loading'에서 안 바뀌게 그대로 둔다

    const selectedIds = loadFridgeSelection()
    // 조미료(category: 'seasoning')는 거의 모든 레시피에 들어가 있어서 추천 매칭에 포함시키면
    // 실제로 가진 재료와 상관없이 추천 목록이 부풀려진다 — fridgeIngredients.js 상단 주석 참고.
    const ownedMatchNames = fridgeIngredients
      .filter((ingredient) => selectedIds.includes(ingredient.id) && ingredient.category !== 'seasoning')
      .flatMap((ingredient) => ingredient.matchNames)

    // fetch가 너무 빨리 끝나서 "찾는 중..." 문구가 눈에 안 보이고 지나가는 문제 — 최소 노출 시간을 둬서
    // 실제 조회 시간과 무관하게 항상 이 시간만큼은 로딩 문구가 보이게 한다.
    const MIN_LOADING_MS = 1200
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS))

    if (ownedMatchNames.length === 0) {
      minDelay.then(() => {
        setReadyRecipes([])
        setShoppingRecipes([])
        setOtherRecipes([])
        setStatus('done')
      })
      return
    }

    const fetchRecipes = fetch(`/api/recipes?matchNames=${ownedMatchNames.join(',')}`)
      .then((res) => res.json())
      .then((data) => groupRecipesByMissingIngredients(data.recipes ?? [], ownedMatchNames, SEASONING_MATCH_NAMES))
      .catch(() => ({ ready: [], shopping: [], others: [] }))

    Promise.all([fetchRecipes, minDelay]).then(([{ ready, shopping, others }]) => {
      setReadyRecipes(ready)
      setShoppingRecipes(shopping)
      setOtherRecipes(others)
      setStatus('done')
    })
  }, [forceLoading])

  function applyFilters(recipes) {
    // 정렬 기준(가격순)만 다르고 나머지(음식종류/시간) 필터 로직은 selectors.js를 그대로 재사용 —
    // 레시피 목록은 원래 저렴한 순으로 들어오므로, 높은순을 고르면 그냥 뒤집기만 하면 됨.
    const byTypeAndTime = filterRecipesByTimeFilter(filterRecipesByType(recipes, categories, selectedType), selectedTimeFilterId)
    const filtered = showLikedOnly ? byTypeAndTime.filter((recipe) => likedIds.includes(recipe.id)) : byTypeAndTime
    return selectedSort === 'price-desc' ? [...filtered].reverse() : filtered
  }

  const filteredReady = applyFilters(readyRecipes)
  const filteredShopping = applyFilters(shoppingRecipes)
  const filteredAll = applyFilters(allRecipesByPrice)
  const hasAnyMatch = readyRecipes.length > 0 || shoppingRecipes.length > 0
  const hasFilteredMatch = filteredReady.length > 0 || filteredShopping.length > 0
  // 가진 재료로는 아무것도 못 찾았을 때만 컷오프(부족 3개 이상)를 풀어서 그나마 가까운 후보를 보여줌.
  // status가 'done'이 되기 전(fetch 진행 중)엔 otherRecipes가 아직 불완전한 스냅샷이라 계산하지 않는다.
  const closestRecipes = status === 'done' && !hasAnyMatch ? getClosestRecipes(applyFilters(otherRecipes), 3) : []
  // 기준 재료 자체가 없어(보유 재료 0개, 또는 조미료만 보유) closestRecipes조차 못 만들 때 보여줄 최후의 대체 후보
  const quickRecipes = status === 'done' && !hasAnyMatch && closestRecipes.length === 0 ? getQuickRecipes(filteredAll, 3) : []

  return (
    <div className="min-h-screen bg-bg-cream">
      <div className="sticky top-0 z-10">
        <TopNav />
      </div>

      <main className="mx-auto max-w-[960px] pb-8">
        {forceLoading ? (
          // 개발용 로딩 화면(?loading=1) — 배너·필터·전체 둘러보기 없이 로딩 표시만 확인
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8">
            <video
              src={loadingAnimation}
              autoPlay
              loop
              muted
              playsInline
              className="w-full select-none rounded-card"
            />
            <p className="font-display text-sm text-text-secondary">끼니가 냉장고 재료로 만들 요리를 찾는 중...</p>
          </div>
        ) : (
          <>
        <PromoBanner />

        <div className="mt-6 flex flex-wrap gap-6 px-8">
          <div className="flex flex-col gap-2">
            <span className="font-display text-base font-bold text-text-primary">음식 종류</span>
            <FilterChipGroup options={typeOptions} selectedId={selectedType} onSelect={setSelectedType} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-display text-base font-bold text-text-primary">조리 시간</span>
            <FilterChipGroup options={timeOptions} selectedId={selectedTimeFilterId} onSelect={setSelectedTimeFilterId} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-display text-base font-bold text-text-primary">정렬</span>
            <FilterChipGroup options={SORT_OPTIONS} selectedId={selectedSort} onSelect={setSelectedSort} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-display text-base font-bold text-text-primary">찜</span>
            <button
              type="button"
              onClick={() => setShowLikedOnly((prev) => !prev)}
              className={`rounded-pill border px-4 py-1.5 font-display text-sm transition ${
                showLikedOnly ? 'border-primary bg-primary text-text-primary' : 'border-border bg-bg-surface text-text-secondary'
              }`}
            >
              즐겨찾기
            </button>
          </div>
        </div>

        {status === 'loading' && (
          <div className="mt-4 flex items-center justify-center gap-2 px-8">
            <video src={loadingAnimation} autoPlay loop muted playsInline className="w-10 select-none" />
            <p className="font-display text-sm text-text-secondary">끼니가 냉장고 재료로 만들 요리를 찾는 중...</p>
          </div>
        )}

        {status === 'done' && !hasAnyMatch && closestRecipes.length === 0 && (
          <section className="mt-4 px-8">
            <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-bg-surface px-6 py-8 text-center shadow-sm">
              <img src={kkinniCharacter} alt="" className="w-28 select-none" />
              <div>
                <p className="font-display text-lg font-bold text-text-primary">어라, 딱 맞는 요리를 못 찾았더랑!</p>
                <p className="mt-1 font-display text-sm text-text-secondary">
                  조미료 말고 진짜 재료(채소·고기·가공식품 등)를 골라주면 끼니가 딱 맞는 요리를 찾아드릴게요.
                </p>
              </div>
              <Link
                to="/"
                className="mt-1 rounded-full bg-primary px-5 py-2 font-display text-base font-bold text-text-primary transition hover:brightness-95"
              >
                재료 고르러 가기
              </Link>
            </div>

            {quickRecipes.length > 0 && (
              <div className="mt-5">
                <h3 className="font-display text-base font-bold text-text-primary">그래도 빨리 만들 수 있는 요리는 있어요</h3>
                <ol className="mt-2 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
                  {quickRecipes.map((recipe) => (
                    <MenuCard
                      key={recipe.id}
                      to={`/recipe/${recipe.id}`}
                      image={recipe.image}
                      emoji={recipe.emoji}
                      name={recipe.name}
                      price={recipe.totalCost}
                      priceSuffix="원"
                      timeLabel={`${recipe.cookTimeMinutes}분`}
                      liked={likedIds.includes(recipe.id)}
                      onToggleLike={() => handleToggleLike(recipe.id)}
                    />
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {closestRecipes.length > 0 && (
          <section className="mt-4 px-8">
            <h3 className="font-display text-base font-bold text-text-primary">이 재료도 있으면 만들 수 있어요</h3>
            <ol className="mt-2 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
              {closestRecipes.map((recipe) => (
                <MenuCard
                  key={recipe.id}
                  to={`/recipe/${recipe.id}`}
                  image={recipe.image}
                  emoji={recipe.emoji}
                  name={recipe.name}
                  price={recipe.totalCost}
                  priceSuffix="원"
                  missingCount={recipe.missingCount}
                  liked={likedIds.includes(recipe.id)}
                  onToggleLike={() => handleToggleLike(recipe.id)}
                />
              ))}
            </ol>
          </section>
        )}

        {hasAnyMatch && !hasFilteredMatch && (
          <p className="mt-2 px-8 font-display text-sm text-text-secondary">
            필터 조건에 맞는 요리가 없어요. 음식종류나 시간 필터를 다르게 골라보세요.
          </p>
        )}

        {filteredReady.length > 0 && (
          <section className="mt-2 px-8">
            <h3 className="flex items-center gap-1.5 font-display text-lg font-bold text-text-primary">
              지금 바로 만들 수 있어요<span className="h-1.5 w-1.5 rounded-full bg-[#8BAF5E]" aria-hidden="true" />
            </h3>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute -left-[108px] top-9 z-10 hidden sm:block">
                <span className="absolute left-2 -top-6 whitespace-nowrap rounded-full border border-border bg-bg-surface px-3 py-1 text-xs font-bold text-primary-text shadow-sm">
                  끼니 픽!
                </span>
                <img src={mascotWave} alt="" className="w-32 select-none" />
              </div>
              <ol className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
                {filteredReady.map((recipe) => (
                  <MenuCard
                    key={recipe.id}
                    to={`/recipe/${recipe.id}`}
                    image={recipe.image}
                    emoji={recipe.emoji}
                    name={recipe.name}
                    price={recipe.totalCost}
                    priceSuffix="원"
                    bestTag={recipe.id === cheapestId}
                    liked={likedIds.includes(recipe.id)}
                    onToggleLike={() => handleToggleLike(recipe.id)}
                  />
                ))}
              </ol>
            </div>
          </section>
        )}

        {filteredShopping.length > 0 && (
          <section className="mt-6 px-8">
            <h3 className="font-display text-lg font-bold text-text-primary">재료 조금만 사면 돼요 🛒</h3>
            <ol className="mt-2 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
              {filteredShopping.map((recipe) => (
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
                  liked={likedIds.includes(recipe.id)}
                  onToggleLike={() => handleToggleLike(recipe.id)}
                />
              ))}
            </ol>
          </section>
        )}

        <h2 className="mt-8 px-8 font-display text-lg font-bold text-text-primary">전체 둘러보기</h2>
        {filteredAll.length === 0 && (
          <p className="mt-2 px-8 font-display text-sm text-text-secondary">필터 조건에 맞는 요리가 없어요.</p>
        )}
        <ol className="mt-2 grid grid-cols-3 gap-3 px-8 max-[640px]:grid-cols-1">
          {filteredAll.map((recipe) => (
            <MenuCard
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              image={recipe.image}
              emoji={recipe.emoji}
              name={recipe.name}
              price={recipe.totalCost}
              priceSuffix="원"
              bestTag={recipe.id === cheapestId}
              liked={likedIds.includes(recipe.id)}
              onToggleLike={() => handleToggleLike(recipe.id)}
            />
          ))}
        </ol>
          </>
        )}
      </main>
    </div>
  )
}

export default Home
