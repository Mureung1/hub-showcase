import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import YouTube from 'react-youtube'
import { fridgeIngredients } from '../data/fridgeIngredients'
import { loadFridgeSelection } from '../data/fridgeStorage'
import { loadLikedRecipes, saveLikedRecipes } from '../data/likedRecipesStorage'
import { buildNaverSearchUrl, buildCoupangSearchUrl, fetchNaverProducts } from '../utils/purchaseLinks'
import { apiUrl } from '../utils/apiBaseUrl'
import { PAGE_BACKGROUND_STYLE } from '../utils/pageBackground'
import CookingSteps from '../components/CookingSteps'
import IngredientList from '../components/IngredientList'
import PurchaseLinkPanel from '../components/PurchaseLinkPanel'
import Thumbnail from '../components/Thumbnail'
import TopNav from '../components/TopNav'
import mascotKkini from '../assets/마스코트-끼니 - 여백 줄임.png'

// prototype/recipe-*.html의 video-block + detail-grid + summary-card 구조를 그대로 포팅.
function RecipeDetailPage() {
  const { recipeId } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9)
  // 재료 이름 -> 사용자가 "이걸 살래" 체크한 네이버 상품. 재료 하나당 상품 하나만(같은 재료를
  // 다시 체크하면 이전 선택을 덮어씀). PurchaseLinkPanel에서 체크박스로 채워지고, 하단
  // "네이버에서 구매" 버튼이 이 링크들을 한 번에 새 탭으로 연다.
  const [pickedProducts, setPickedProducts] = useState({})
  // 있는/없는 재료 목록에서 체크박스를 누른 재료 이름 -> 최저가 fetch가 아직 안 끝난 상태.
  // fetch 중엔 체크박스를 비활성화해서 중복 클릭을 막는다.
  const [pendingNames, setPendingNames] = useState(() => new Set())
  const [likedIds, setLikedIds] = useState(() => loadLikedRecipes())

  useEffect(() => {
    setRecipe(null)
    setNotFound(false)
    setSelectedIngredient(null)
    setIsPlaying(false)
    setVideoAspectRatio(16 / 9)

    fetch(apiUrl(`/api/recipes/${recipeId}`))
      .then((res) => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then((data) => setRecipe(data.recipe))
      .catch(() => setNotFound(true))
  }, [recipeId])

  // 유튜브 쇼츠처럼 세로 영상이면 16:9로 고정된 히어로 박스에 필러박스(양옆 여백)가 생기므로,
  // 실제 영상 크기를 가져와 컨테이너 비율을 맞춘다 (실패하면 16:9로 그대로 둠).
  // 서버(/api/youtube/dimensions)를 거쳐 워치 페이지의 og:video 메타 태그에서 진짜 크기를 읽어온다
  // (oEmbed의 width/height는 실제 영상과 무관하게 고정값이라 못 씀 — 실측으로 확인됨).
  useEffect(() => {
    const youtubeId = recipe?.youtubeId
    if (!youtubeId) return

    let cancelled = false
    fetch(apiUrl(`/api/youtube/dimensions?videoId=${youtubeId}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.width && data?.height) {
          setVideoAspectRatio(data.width / data.height)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [recipe?.youtubeId])

  if (notFound) {
    return (
      <>
        <TopNav />
        <main className="min-h-screen bg-bg-page px-4 py-10 text-center text-text-secondary" style={PAGE_BACKGROUND_STYLE}>
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
        <main className="min-h-screen bg-bg-page px-4 py-10 text-center text-text-secondary" style={PAGE_BACKGROUND_STYLE}>불러오는 중...</main>
      </>
    )
  }

  const selectedIds = loadFridgeSelection()
  // Home.jsx의 추천 매칭과 달리 여기는 조미료(category: 'seasoning')도 그대로 포함한다 —
  // 보유/구매 필요 표시는 재료 하나하나의 정확도가 중요해서 조미료를 빼면 안 됨.
  const ownedNames = fridgeIngredients
    .filter((ingredient) => selectedIds.includes(ingredient.id))
    .flatMap((ingredient) => ingredient.matchNames)

  const ownedIngredients = recipe.ingredients.filter((ingredient) => ownedNames.includes(ingredient.name))
  const missingIngredients = recipe.ingredients.filter((ingredient) => !ownedNames.includes(ingredient.name))

  function handleToggleLike() {
    setLikedIds((prev) => {
      const next = prev.includes(recipe.id) ? prev.filter((id) => id !== recipe.id) : [...prev, recipe.id]
      saveLikedRecipes(next)
      return next
    })
  }

  function handleTogglePick(ingredientName, product) {
    setPickedProducts((prev) => {
      const next = { ...prev }
      if (next[ingredientName]?.link === product.link) {
        delete next[ingredientName]
      } else {
        next[ingredientName] = product
      }
      return next
    })
  }

  // 있는/없는 재료 목록 체크박스 전용 — 이미 골라둔 상품이 있으면 그냥 해제, 없으면 그 재료의
  // 네이버 최저가를 fetch해서 담는다("선택한 재료" 패널에서 직접 고른 상품이 있으면 그대로 유지).
  async function handleToggleIngredientPicked(ingredient) {
    const name = ingredient.name
    if (pickedProducts[name]) {
      setPickedProducts((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
      return
    }

    setPendingNames((prev) => new Set(prev).add(name))
    try {
      const items = await fetchNaverProducts(name)
      const cheapest = items[0]
      if (cheapest) {
        setPickedProducts((prev) => ({ ...prev, [name]: cheapest }))
      }
    } catch {
      // 실패하면 그냥 체크 안 된 상태로 둔다 — "선택한 재료" 패널에서 직접 검색·선택할 수 있음
    } finally {
      setPendingNames((prev) => {
        const next = new Set(prev)
        next.delete(name)
        return next
      })
    }
  }

  const pickedNames = new Set(Object.keys(pickedProducts))
  const pickedLinks = Object.values(pickedProducts).map((product) => product.link)

  // 체크해둔 상품이 있으면 그 링크들을 한 번에 새 탭으로 연다. 클릭 핸들러 안에서 동기적으로
  // window.open을 반복 호출해야 브라우저 팝업 차단에 안 걸린다(비동기 이후에 열면 막힘).
  function handleBuyClick(event) {
    if (pickedLinks.length === 0) return
    event.preventDefault()
    pickedLinks.forEach((link) => window.open(link, '_blank', 'noopener,noreferrer'))
  }

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-bg-page px-4 py-8" style={PAGE_BACKGROUND_STYLE}>
      <div className={videoAspectRatio < 1 ? 'mx-auto max-w-5xl' : 'mx-auto max-w-2xl'}>
        {/* 제목/부제 — 영상보다 위, 페이지 맨 위에 항상 고정 (레이아웃·영상 방향과 무관).
            부족 재료 개수 배지는 없앰 — 바로 아래 "있는 재료"/"없는 재료" 카드가 같은 정보를 더 정확히 보여줌. */}
        <div className="relative px-10 text-center">
          <div className="flex flex-wrap items-baseline justify-center gap-2">
            <h1 className="font-display text-2xl font-bold text-text-primary">{recipe.name}</h1>
            <p className="font-display text-sm text-text-secondary">
              {recipe.servings}인분{recipe.cookTimeMinutes ? ` · ${recipe.cookTimeMinutes}분` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleLike}
            aria-label={likedIds.includes(recipe.id) ? '찜 해제' : '찜하기'}
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-surface text-xl shadow transition hover:scale-110"
          >
            <span className={likedIds.includes(recipe.id) ? 'text-accent-heart' : 'text-text-secondary'}>
              {likedIds.includes(recipe.id) ? '★' : '☆'}
            </span>
          </button>
        </div>

        {/* 영상 + 재료/구매패널 묶음 — 가로 영상은 항상 세로로 쌓임(기존과 동일).
            세로 영상(쇼츠 등)은 데스크톱(lg 이상)에서만 영상(왼쪽 고정폭)+정보(오른쪽)를 2단으로 배치해
            영상 옆의 빈 공간을 활용한다. 모바일에서는 세로 영상도 기존처럼 위/아래로 쌓인다.
            재료가 많아 오른쪽 컬럼이 영상보다 길어지면 영상 아래 왼쪽에 빈 공간이 생기므로,
            데스크톱에서는 영상을 sticky로 고정해 오른쪽을 스크롤해도 계속 따라오게 한다.
            youtubeId가 있으면 재생 버튼을 눌렀을 때만 iframe을 마운트한다 (지연 로딩). */}
        <div className={`mt-4 flex flex-col gap-6 ${videoAspectRatio < 1 ? 'lg:flex-row lg:items-start' : ''}`}>
          <div
            className={`relative overflow-hidden rounded-banner border-[3.6px] border-ink ${
              videoAspectRatio < 1
                ? 'mx-auto w-full max-w-sm shrink-0 aspect-[9/16] lg:sticky lg:top-8 lg:mx-0'
                : 'w-full aspect-video'
            }`}
          >
            {isPlaying && recipe.youtubeId ? (
              <YouTube
                videoId={recipe.youtubeId}
                opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }}
                className="h-full w-full"
                iframeClassName="h-full w-full"
              />
            ) : (
              <>
                <Thumbnail image={recipe.image} emoji={recipe.emoji} alt={recipe.name} className="h-full w-full text-6xl" />
                {recipe.youtubeId && (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-bg-surface/90 pl-1 text-xl text-text-primary shadow">
                      ▶
                    </span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex-1">
            <CookingSteps steps={recipe.steps} twoColumn={videoAspectRatio >= 1} />

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-card border-[3.6px] border-ink bg-bg-surface p-4">
                <h2 className="text-center font-display text-base font-bold text-text-primary">있는 재료</h2>
                <div className="mt-3">
                  {ownedIngredients.length > 0 ? (
                    <IngredientList
                      ingredients={ownedIngredients}
                      ownedNames={ownedNames}
                      selectedName={selectedIngredient?.name}
                      onSelect={setSelectedIngredient}
                      pickedNames={pickedNames}
                      onTogglePicked={handleToggleIngredientPicked}
                      pendingNames={pendingNames}
                    />
                  ) : (
                    <p className="text-center font-display text-sm text-text-secondary">있는 재료가 없어요.</p>
                  )}
                </div>
              </div>

              <div className="rounded-card border-[3.6px] border-[#F0B7A8] bg-[#FDEDE9] p-4">
                <h2 className="text-center font-display text-base font-bold text-text-primary">없는 재료</h2>
                <div className="mt-3">
                  {missingIngredients.length > 0 ? (
                    <IngredientList
                      ingredients={missingIngredients}
                      ownedNames={ownedNames}
                      selectedName={selectedIngredient?.name}
                      onSelect={setSelectedIngredient}
                      pickedNames={pickedNames}
                      onTogglePicked={handleToggleIngredientPicked}
                      pendingNames={pendingNames}
                    />
                  ) : (
                    <p className="text-center font-display text-sm text-text-secondary">구매할 재료가 없어요!</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <PurchaseLinkPanel
                ingredient={selectedIngredient}
                pickedLink={selectedIngredient ? pickedProducts[selectedIngredient.name]?.link : null}
                onTogglePick={(product) => handleTogglePick(selectedIngredient.name, product)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start justify-end gap-3">
          <div className="relative max-w-xs rounded-2xl border-2 border-ink bg-[#FFF3DF] px-4 py-3 font-display text-sm text-text-primary">
            Tip: {recipe.tip ?? '재료를 신선하게 준비해두면 더 맛있어요!'}
            <span className="absolute top-4 -right-[7px] h-3 w-3 rotate-45 border-r-2 border-t-2 border-ink bg-[#FFF3DF]" />
          </div>
          <img src={mascotKkini} alt="" className="w-14 select-none" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-card border-[3.6px] border-ink bg-primary px-5 py-4">
          <div>
            <p className="font-display text-xs text-text-primary">1인분 총 재료비</p>
            <p className="font-display text-2xl font-bold text-text-primary">{recipe.totalCost.toLocaleString()}원</p>
          </div>
          <a
            href={buildNaverSearchUrl(`${recipe.name} 재료`)}
            target="_blank"
            rel="noreferrer"
            onClick={handleBuyClick}
            className="rounded-full border-2 border-ink bg-bg-surface px-5 py-3 font-display text-sm font-bold text-text-primary transition hover:brightness-95"
          >
            🛒 {pickedLinks.length > 0 ? `선택한 ${pickedLinks.length}개 구매하기` : '네이버에서 구매'}
          </a>
        </div>
        {pickedLinks.length > 0 && (
          <p className="mt-2 text-center font-display text-xs text-text-secondary">
            선택한 상품마다 새 탭이 열려요. 안 열리면 브라우저 팝업 차단을 해제해주세요.
          </p>
        )}
        <a
          href={buildCoupangSearchUrl(`${recipe.name} 재료`)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-center font-display text-xs text-text-secondary underline line-through hover:text-text-primary"
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
