import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IngredientChipPicker from '../components/IngredientChipPicker'
import IngredientSearchInput from '../components/IngredientSearchInput'
import { fridgeIngredients, INGREDIENT_CATEGORIES, DEFAULT_SEASONING_IDS } from '../data/fridgeIngredients'
import { mockRecipes } from '../data/mockRecipes'
import { getIngredientsByCategory, sortIngredientsByRecipeCount } from '../data/selectors'
import { getStorageZone } from '../data/fridgeStorageZones'
import { loadFridgeSelection, saveFridgeSelection } from '../data/fridgeStorage'
import { flyIngredientToFridge } from '../utils/fridgeFlyAnimation'
import fridgeEmpty from '../assets/fridge-empty.png'

// 섹션 안에서 많은 레시피에 쓰이는 재료가 앞에 오도록 정렬 — 자주 쓰는 재료를 스캔하기 쉽게
const ingredientGroups = getIngredientsByCategory(fridgeIngredients, INGREDIENT_CATEGORIES).map((group) => ({
  ...group,
  ingredients: sortIngredientsByRecipeCount(group.ingredients, mockRecipes),
}))
const fridgeIngredientsById = new Map(fridgeIngredients.map((ingredient) => [ingredient.id, ingredient]))

// 진입 화면: 기니가 냉장고를 들여다보며 "어떤 재료가 있더랑?" 묻고,
// 사용자가 아래 카드(말풍선에 대답하는 구도)에서 재료 칩을 골라 "완료"를 누르면 홈으로 넘어간다.
function FridgePage() {
  // 저장된 선택이 아예 없으면(첫 방문) 조미료를 기본으로 체크해둔다 — 매번 새로 누르기 귀찮지 않게.
  const [selectedIds, setSelectedIds] = useState(() => {
    const saved = loadFridgeSelection()
    return saved.length > 0 ? saved : DEFAULT_SEASONING_IDS
  })
  const navigate = useNavigate()
  const fridgeImgRef = useRef(null)

  // 새로 선택된 재료를 냉장고 그림 속 알맞은 칸(채소→신선칸, 나머지→선반, 액체류→문칸)으로 날아 들어가게 한다.
  // 선택 해제는 애니메이션 없이 즉시 처리한다 (아래 handleToggle/handleSelectFromSearch에서 추가되는 경우에만 호출).
  function animateEntry(id, originEl) {
    const ingredient = fridgeIngredientsById.get(id)
    if (!ingredient || !originEl || !fridgeImgRef.current) return
    flyIngredientToFridge({
      originEl,
      fridgeImageEl: fridgeImgRef.current,
      emoji: ingredient.emoji,
      zone: getStorageZone(ingredient),
    })
  }

  function handleToggle(id, event) {
    const isAdding = !selectedIds.includes(id)
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
    if (isAdding) animateEntry(id, event?.currentTarget)
  }

  function handleClear() {
    setSelectedIds([])
  }

  function handleSelectFromSearch(id, event) {
    const isAdding = !selectedIds.includes(id)
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    if (isAdding) animateEntry(id, event?.currentTarget)
  }

  function handleComplete() {
    saveFridgeSelection(selectedIds)
    navigate('/home')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-cream px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <img
          ref={fridgeImgRef}
          src={fridgeEmpty}
          alt="끼니픽 — 문 열린 냉장고를 들여다보는 기니, '어떤 재료가 있더랑?'"
          className="w-full select-none"
        />

        {/* 기니의 말풍선에 대답하는 카드 — 우상단 꼬리가 기니 쪽을 가리킨다 */}
        <section className="relative mt-5 rounded-card border border-border bg-bg-surface p-4 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute -top-1.5 right-[16%] h-3 w-3 rotate-45 border-l border-t border-border bg-bg-surface"
          />

          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-text-primary">내가 가진 재료는</h1>
            {selectedIds.length > 0 && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-text">
                {selectedIds.length}개
              </span>
            )}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-auto text-xs text-text-secondary underline hover:text-text-primary"
              >
                전체 해제
              </button>
            )}
          </div>

          <div className="mt-3">
            <IngredientSearchInput options={fridgeIngredients} onSelect={handleSelectFromSearch} />
          </div>

          <div className="mt-3 rounded-card bg-bg-muted p-3">
            {ingredientGroups.map((group, index) => (
              <div key={group.id} className={index > 0 ? 'mt-3' : undefined}>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                  {group.label}
                </h2>
                <IngredientChipPicker
                  options={group.ingredients}
                  selectedIds={selectedIds}
                  onToggle={handleToggle}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className="mt-4 w-full rounded-full bg-primary py-3 text-base font-bold text-text-primary transition hover:brightness-95"
          >
            완료
          </button>
        </section>
      </div>
    </main>
  )
}

export default FridgePage
