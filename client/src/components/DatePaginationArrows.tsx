import './DatePaginationArrows.css'

type DatePaginationArrowsProps = {
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
}

// claude: usePagedDateRange를 쓰는 화면(일정 입력, 결과 히트맵)이 공통으로 쓰는 7일 이동 화살표.
function DatePaginationArrows({ canGoPrev, canGoNext, onPrev, onNext }: DatePaginationArrowsProps) {
  return (
    <div className="date-pagination">
      <button type="button" className="date-pagination__arrow" aria-label="이전 7일" disabled={!canGoPrev} onClick={onPrev}>
        ‹
      </button>
      <button type="button" className="date-pagination__arrow" aria-label="다음 7일" disabled={!canGoNext} onClick={onNext}>
        ›
      </button>
    </div>
  )
}

export default DatePaginationArrows
