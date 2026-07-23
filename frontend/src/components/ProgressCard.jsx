const STATUS_META = {
  PLANNED: { label: '예정', className: 'progress-card--planned' },
  IN_PROGRESS: { label: '준비 중', className: 'progress-card--in-progress' },
  COMPLETED: { label: '완료', className: 'progress-card--completed' },
}

const URGENCY_META = {
  OVERDUE: { label: '기한 지남', className: 'progress-card__urgency--overdue' },
  IMMINENT: { label: '임박', className: 'progress-card__urgency--imminent' },
  UPCOMING: { label: '여유', className: 'progress-card__urgency--upcoming' },
  NONE: null,
}

function ProgressCard({ id, certificationName, issuer, status, targetDate, urgency, onStatusChange }) {
  const statusMeta = STATUS_META[status] ?? STATUS_META.PLANNED
  const urgencyMeta = URGENCY_META[urgency]

  return (
    <div className={`progress-card ${statusMeta.className}`}>
      <div className="progress-card__top">
        <div className="progress-card__name">{certificationName}</div>
        <span className="progress-card__status-tag">{statusMeta.label}</span>
      </div>
      <div className="progress-card__meta">
        <span>{issuer}</span>
        {targetDate && <span>목표일 {targetDate}</span>}
        {urgencyMeta && <span className={`progress-card__urgency ${urgencyMeta.className}`}>{urgencyMeta.label}</span>}
      </div>
      <select
        className="progress-card__status-select"
        value={status}
        onChange={(e) => onStatusChange(id, e.target.value, targetDate)}
      >
        <option value="PLANNED">예정</option>
        <option value="IN_PROGRESS">준비 중</option>
        <option value="COMPLETED">완료</option>
      </select>
    </div>
  )
}

export default ProgressCard
