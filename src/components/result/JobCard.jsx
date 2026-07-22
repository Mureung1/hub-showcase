import { JOB_CATEGORY_STYLE, DEFAULT_CATEGORY_STYLE, STATUS_STYLE } from '../../constants/resultDisplay'

function JobCard({ job, onClick, bookmarked, onToggleBookmark }) {
  const categoryStyle = JOB_CATEGORY_STYLE[job.job_category] || DEFAULT_CATEGORY_STYLE
  const statusStyle = STATUS_STYLE[job.status] || STATUS_STYLE.match

  // job-card 자체가 <button>이라 별 아이콘을 진짜 <button>으로 중첩할 수 없다(무효한 HTML) —
  // role="button" span으로 대체하고 클릭/키보드 둘 다 처리한다.
  function handleBookmarkClick(event) {
    event.stopPropagation()
    onToggleBookmark()
  }
  function handleBookmarkKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      onToggleBookmark()
    }
  }

  return (
    <button className="job-card" style={{ borderLeftColor: categoryStyle.text }} onClick={onClick}>
      <div className="job-card-main">
        <span className="job-type-badge" style={{ background: categoryStyle.bg, color: categoryStyle.text }}>
          {categoryStyle.letter}
        </span>
        <div>
          <p className="job-title">{job.title}</p>
          <p className="job-meta">
            {job.company} · {job.is_intern ? '인턴' : '정규'}
          </p>
          {job.checklist && (
            <div className="job-check">
              {job.checklist.map((c) => (
                <span key={c.category} className={c.ok ? 'ok' : 'no'}>
                  {c.ok ? '✓' : '✕'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="job-card-side">
        {onToggleBookmark && (
          <span
            className={`bookmark-toggle-btn${bookmarked ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={handleBookmarkClick}
            onKeyDown={handleBookmarkKeyDown}
            aria-label={bookmarked ? '북마크 해제' : '북마크 추가'}
            title={bookmarked ? '북마크 해제' : '북마크 추가'}
          >
            {bookmarked ? '★' : '☆'}
          </span>
        )}
        {job.statusLabel && (
          <span className="status-tag" style={{ background: statusStyle.bg, color: statusStyle.text }}>
            {job.statusLabel}
          </span>
        )}
      </div>
    </button>
  )
}

export default JobCard
