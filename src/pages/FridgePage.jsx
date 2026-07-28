import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import IngredientChipPicker from '../components/IngredientChipPicker'
import IngredientSearchInput from '../components/IngredientSearchInput'
import { fridgeIngredients, INGREDIENT_CATEGORIES, DEFAULT_SEASONING_IDS } from '../data/fridgeIngredients'
import { mockRecipes } from '../data/mockRecipes'
import { getIngredientsByCategory, sortIngredientsByRecipeCount } from '../data/selectors'
import { loadFridgeSelection, saveFridgeSelection } from '../data/fridgeStorage'
import fridgePhoto from '../assets/냉장고.png'
import carrotIcon from '../assets/당근.png'
import meatSeafoodIcon from '../assets/물고기고기.png'
import processedIcon from '../assets/가공식품.png'
import noodleGrainIcon from '../assets/탄수화물.png'
import seasoningIcon from '../assets/시즈닝.png'
import etcIcon from '../assets/식용유.png'
import bgPattern from '../assets/a_high_quality_wide_background_asset_for_the_kkinipick_app_extending_the_style-Photoroom.png'

// 섹션 안에서 많은 레시피에 쓰이는 재료가 앞에 오도록 정렬 — 자주 쓰는 재료를 스캔하기 쉽게
const rawIngredientGroups = getIngredientsByCategory(fridgeIngredients, INGREDIENT_CATEGORIES).map((group) => ({
  ...group,
  ingredients: sortIngredientsByRecipeCount(group.ingredients, mockRecipes),
}))

// 냉장고 화면 탭에서는 "고기"·"해산물"을 "고기 / 해산물" 하나로 합쳐서 보여줌 (데이터상 category는 그대로 meat/seafood 유지 —
// 다른 화면 로직에 영향 없게 이 화면의 표시용 그룹만 합친다)
const ingredientGroups = (() => {
  const meat = rawIngredientGroups.find((group) => group.id === 'meat')
  const seafood = rawIngredientGroups.find((group) => group.id === 'seafood')
  let mergedAdded = false

  return rawIngredientGroups.reduce((groups, group) => {
    if (group.id === 'meat' || group.id === 'seafood') {
      if (!mergedAdded) {
        mergedAdded = true
        groups.push({
          id: 'meat-seafood',
          label: '고기 해산물',
          ingredients: sortIngredientsByRecipeCount(
            [...(meat?.ingredients ?? []), ...(seafood?.ingredients ?? [])],
            mockRecipes,
          ),
        })
      }
      return groups
    }
    groups.push(group)
    return groups
  }, [])
})()

const fridgeIngredientsById = new Map(fridgeIngredients.map((ingredient) => [ingredient.id, ingredient]))

// 카테고리 탭 아이콘 — 전부 직접 그린 일러스트로 교체됨
const CATEGORY_ICON_IMAGES = {
  vegetable: carrotIcon,
  processed: processedIcon,
  'noodle-grain': noodleGrainIcon,
  seasoning: seasoningIcon,
  etc: etcIcon,
  'meat-seafood': meatSeafoodIcon,
}

// 진입 화면: 끼니가 냉장고를 들여다보며 "어떤 재료가 있더랑?" 묻고,
// 사용자가 아래 카드(말풍선에 대답하는 구도)에서 카테고리 탭을 골라가며 재료 칩을 고르고
// "완료"를 누르면 홈으로 넘어간다. (prototype-v2 fridge-flow 레이아웃을 그대로 포팅)
function FridgePage() {
  // 저장된 선택이 아예 없으면(첫 방문) 조미료를 기본으로 체크해둔다 — 매번 새로 누르기 귀찮지 않게.
  const [selectedIds, setSelectedIds] = useState(() => {
    const saved = loadFridgeSelection()
    return saved.length > 0 ? saved : DEFAULT_SEASONING_IDS
  })
  const [activeCategory, setActiveCategory] = useState(ingredientGroups[0]?.id)
  const navigate = useNavigate()

  function handleToggle(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function handleSelectAll() {
    setSelectedIds(fridgeIngredients.map((ingredient) => ingredient.id))
  }

  function handleClear() {
    setSelectedIds([])
  }

  function handleSelectFromSearch(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  function handleComplete() {
    const hasRealIngredient = selectedIds.some(
      (id) => fridgeIngredientsById.get(id)?.category !== 'seasoning',
    )
    if (!hasRealIngredient) {
      const proceed = window.confirm(
        '어라, 조미료 말고 진짜 재료는 하나도 안 골랐더랑! 이대로 가면 끼니가 요리를 잘 못 찾을 수도 있어요. 그래도 홈으로 갈까요?',
      )
      if (!proceed) return
    }
    saveFridgeSelection(selectedIds)
    navigate('/home')
  }

  const activeGroup = ingredientGroups.find((group) => group.id === activeCategory) ?? ingredientGroups[0]

  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      <TopNav />
      <main
        className="flex flex-1 flex-col overflow-hidden px-0 py-8"
        style={{
          backgroundImage: `url(${bgPattern}), linear-gradient(180deg, #F0D198, #E6A76F)`,
          backgroundRepeat: 'no-repeat, no-repeat',
          backgroundSize: 'auto 100%, 100% 100%',
          backgroundPosition: 'center, center',
        }}
      >
        <div className="relative z-20 mx-auto w-full max-w-[420px] px-4">
          <img
            src={fridgePhoto}
            alt="끼니픽 — 문 열린 냉장고를 들여다보는 끼니"
            className="w-full select-none"
          />
        </div>

        {/* 끼니의 말풍선에 대답하는 카드 — 끼니 앞발이 사진 하단에 걸쳐 카드 위로 나오도록 사진 쪽 z-index를 더 높게 둠 */}
        <section className="relative z-10 mx-auto -mt-2.5 w-full max-w-[820px] rounded-container border-4 border-ink bg-bg-surface p-4 shadow-[8px_8px_0_rgba(91,65,48,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg text-text-primary">냉장고에 뭐가 있나요?</h1>
              {selectedIds.length > 0 && (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-text">
                  {selectedIds.length}개
                </span>
              )}
              {selectedIds.length < fridgeIngredients.length && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-text-secondary underline hover:text-text-primary"
                >
                  전체 선택
                </button>
              )}
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-text-secondary underline hover:text-text-primary"
                >
                  전체 해제
                </button>
              )}
            </div>
            <div className="min-w-[280px]">
              <IngredientSearchInput options={fridgeIngredients} onSelect={handleSelectFromSearch} />
            </div>
          </div>

          <div className="mt-1.5 border-b-2 border-dashed border-border pb-1.5" />

          <div className="mt-4 flex items-start gap-4">
            <div className="flex w-32 shrink-0 flex-col gap-2">
              {ingredientGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveCategory(group.id)}
                  className={`flex items-center gap-2 rounded-xl border-[3px] px-2 py-1.5 text-left shadow-[2px_2px_0_rgba(91,65,48,0.22)] ${
                    group.id === activeCategory ? 'border-primary bg-primary-soft' : 'border-ink bg-bg-page'
                  }`}
                >
                  {CATEGORY_ICON_IMAGES[group.id] ? (
                    <img src={CATEGORY_ICON_IMAGES[group.id]} alt="" className="h-9 w-9 object-contain" />
                  ) : (
                    <span className="text-2xl">🍽️</span>
                  )}
                  <span
                    className={`font-display text-lg ${
                      group.id === activeCategory ? 'font-bold text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {group.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1">
              {activeGroup && (
                <IngredientChipPicker
                  options={activeGroup.ingredients}
                  selectedIds={selectedIds}
                  onToggle={handleToggle}
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className="mx-auto mt-4 block w-full max-w-[280px] rounded-full border-[3px] border-ink bg-primary py-3.5 font-display text-base text-text-primary shadow-[4px_4px_0_rgba(91,65,48,0.22)] transition hover:brightness-95"
          >
            완료 ({selectedIds.length}) ✓
          </button>
        </section>
      </main>
    </div>
  )
}

export default FridgePage
