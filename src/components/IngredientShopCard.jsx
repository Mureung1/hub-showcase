import Thumbnail from './Thumbnail'

// MenuCard와 같은 카드 껍데기(테두리·순위 배지·Thumbnail)를 쓰지만, 클릭해도 페이지 이동 없이
// 아래 PurchaseLinkPanel만 갱신하는 구조라 Link가 아니라 버튼 내장 카드로 따로 만듦.
// 사진·가격은 네이버 최저가 검색 결과(fetchState)에서 가져오고, 아직 안 불러왔거나 실패하면
// Thumbnail이 이모지로 자동 대체한다.
function IngredientShopCard({ rank, ingredient, fetchState, isSelected, onCompareClick }) {
  const cheapest = fetchState?.items?.[0] ?? null
  const isDone = fetchState?.status === 'done'
  const isError = fetchState?.status === 'error'

  return (
    <li>
      <article
        className={`relative flex flex-col overflow-hidden rounded-card border-[3.6px] bg-bg-surface transition ${
          isSelected ? 'border-primary' : 'border-ink'
        }`}
      >
        {rank && (
          <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface/90 text-xs font-semibold text-primary-text shadow">
            {rank}
          </span>
        )}
        <Thumbnail image={cheapest?.image} emoji={ingredient.emoji} alt={ingredient.label} className="aspect-video w-full text-4xl" />
        <div className="flex flex-1 flex-col p-3">
          <p className="truncate font-display text-base font-bold text-text-primary">{ingredient.label}</p>
          <p className="mt-1 font-display text-lg font-bold text-primary-text">
            {isDone && cheapest && `${cheapest.price.toLocaleString()}원`}
            {(isError || (isDone && !cheapest)) && <span className="text-sm font-normal text-text-secondary">가격 정보 없음</span>}
            {!isDone && !isError && <span className="text-sm font-normal text-text-secondary">가격 확인 중...</span>}
          </p>
          <button
            type="button"
            onClick={() => onCompareClick(ingredient)}
            className={`mt-2 rounded-full border-2 border-ink px-3 py-1.5 font-display text-sm font-bold transition ${
              isSelected ? 'bg-primary text-text-primary' : 'bg-bg-surface text-text-primary hover:bg-primary-soft'
            }`}
          >
            가격 비교
          </button>
        </div>
      </article>
    </li>
  )
}

export default IngredientShopCard
