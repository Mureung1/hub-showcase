import ProgressCard from './ProgressCard.jsx'

const FILTER_OPTIONS = [
  { value: null, label: '전체' },
  { value: 'PLANNED', label: '예정' },
  { value: 'IN_PROGRESS', label: '준비 중' },
  { value: 'COMPLETED', label: '완료' },
]

function ProgressList({ items, isLoading, error, statusFilter, onStatusFilterChange, onStatusChange }) {
  return (
    <div className="progress-list">
      <div className="progress-list__heading">추적 중인 자격증</div>

      <div className="progress-list__filters">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`progress-list__filter-chip ${
              statusFilter === option.value ? 'progress-list__filter-chip--active' : ''
            }`}
            onClick={() => onStatusFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="cert-list__status">불러오는 중...</div>}

      {!isLoading && error && <div className="cert-list__status cert-list__status--error">{error}</div>}

      {!isLoading && !error && items.length === 0 && (
        <div className="cert-list__status">아직 추적 중인 자격증이 없습니다. 위에서 추가해보세요.</div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="cert-list__items">
          {items.map((item) => (
            <ProgressCard key={item.id} {...item} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ProgressList
