import { useEffect, useRef } from 'react'
import type { Store } from '../types/store'
import './StoreList.css'

type StoreListProps = {
  stores: Store[]
  recommendedStoreId: string | null
  selectedStoreId: string | null
  isLoading: boolean
  hasMore: boolean
  error?: string | null
  onLoadMore: () => void
  onStoreSelect: (storeId: string) => void
  onViewDetail: (store: Store) => void
  onClose: () => void
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  )
}

function formatDistance(distance: number) {
  if (distance >= 1000) return `${(distance / 1000).toFixed(1)}km`
  return `${distance}m`
}

function StoreList({
  stores,
  recommendedStoreId,
  selectedStoreId,
  isLoading,
  hasMore,
  error = null,
  onLoadMore,
  onStoreSelect,
  onViewDetail,
  onClose,
}: StoreListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore()
      },
      { rootMargin: '180px 0px' },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  useEffect(() => {
    if (!selectedStoreId) return
    cardRefs.current.get(selectedStoreId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [selectedStoreId])

  return (
    <div className="store-list">
      <div className="store-list__header">
        <h2>검색 결과</h2>
        <div className="store-list__header-actions">
          <span>{stores.length}개</span>
          <button
            className="store-list__close"
            type="button"
            aria-label="검색 결과 닫기"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {stores.length === 0 && !isLoading && !error && (
        <div className="store-list__empty">조건에 맞는 가게가 없습니다.</div>
      )}

      {error && <div className="store-list__error" role="alert">{error}</div>}

      <div className="store-list__items">
        {stores.map((store) => {
          const isSelected = store.id === selectedStoreId
          const isRecommended = store.id === recommendedStoreId

          return (
            <article
              ref={(element) => {
                if (element) cardRefs.current.set(store.id, element)
                else cardRefs.current.delete(store.id)
              }}
              className={[
                'store-card',
                isSelected && 'store-card--selected',
                isRecommended && 'store-card--recommended',
              ]
                .filter(Boolean)
                .join(' ')}
              key={store.id}
            >
              {isRecommended && (
                <span className="store-card__recommendation-badge">
                  상황 추천 1위
                </span>
              )}

              <button
                className="store-card__select"
                type="button"
                aria-pressed={isSelected}
                onClick={() => onStoreSelect(store.id)}
              >
                <span className="store-card__topline">
                  <strong>{store.name}</strong>
                  <span>{formatDistance(store.distance)}</span>
                </span>
                <span className="store-card__category">
                  {store.category} · {store.categoryName.split(' > ').at(-1)}
                </span>
                <span className="store-card__reviews">
                  {store.reviewCount > 0 && store.rating !== null
                    ? `★ ${store.rating.toFixed(1)} · 리뷰 ${store.reviewCount}개`
                    : '아직 리뷰가 없어요'}
                </span>
                {store.recommendationScore !== undefined && (
                  <span className="store-card__recommendation">
                    상황 적합도 {store.recommendationScore}점
                    {store.recommendationDataCount === 0 && ' · 평가 데이터 부족'}
                  </span>
                )}
                <span className="store-card__address">
                  {store.roadAddress || store.address}
                </span>
                {store.phone && <span className="store-card__phone">{store.phone}</span>}
              </button>

              <button
                className="store-card__detail"
                type="button"
                onClick={() => onViewDetail(store)}
              >
                상세보기
              </button>
            </article>
          )
        })}
      </div>

      <div ref={loadMoreRef} className="store-list__sentinel" aria-hidden="true" />
      {isLoading && <div className="store-list__loading">가게를 불러오는 중...</div>}
      {!hasMore && stores.length > 0 && (
        <div className="store-list__end">모든 결과를 불러왔습니다.</div>
      )}
    </div>
  )
}

export default StoreList
