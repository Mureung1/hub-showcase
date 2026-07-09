import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IngredientChipPicker from '../components/IngredientChipPicker'
import { fridgeIngredients } from '../data/fridgeIngredients'
import { loadFridgeSelection, saveFridgeSelection } from '../data/fridgeStorage'
import fridgeEmpty from '../assets/fridge-empty.png'

// 진입 화면: 기니가 냉장고를 들여다보며 "어떤 재료가 있더랑?" 묻고,
// 사용자가 아래 카드(말풍선에 대답하는 구도)에서 재료 칩을 골라 "완료"를 누르면 홈으로 넘어간다.
function FridgePage() {
  const [selectedIds, setSelectedIds] = useState(loadFridgeSelection)
  const navigate = useNavigate()

  function handleToggle(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function handleClear() {
    setSelectedIds([])
  }

  function handleComplete() {
    saveFridgeSelection(selectedIds)
    navigate('/home')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-cream px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <img
          src={fridgeEmpty}
          alt="끼니픽 — 문 열린 냉장고를 들여다보는 기니, '어떤 재료가 있더랑?'"
          className="w-full"
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
            <IngredientChipPicker
              options={fridgeIngredients}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />
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
