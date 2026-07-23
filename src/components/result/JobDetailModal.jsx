import { JOB_CATEGORY_STYLE, DEFAULT_CATEGORY_STYLE, STATUS_STYLE } from '../../constants/resultDisplay'
import { describeComputerSkill } from '../../lib/gapAnalysis'

function JobDetailModal({ job, onClose, bookmarked, onToggleBookmark }) {
  if (!job) return null
  const categoryStyle = JOB_CATEGORY_STYLE[job.job_category] || DEFAULT_CATEGORY_STYLE
  const statusStyle = STATUS_STYLE[job.status] || STATUS_STYLE.match

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <span
            className="job-type-badge"
            style={{ background: categoryStyle.bg, color: categoryStyle.text, width: 26, height: 26, flexShrink: 0 }}
          >
            {categoryStyle.letter}
          </span>
          <p className="job-title" style={{ margin: 0, flex: 1 }}>
            {job.title}
          </p>
          {onToggleBookmark && (
            <button
              type="button"
              className={`bookmark-toggle-btn${bookmarked ? ' active' : ''}`}
              onClick={onToggleBookmark}
              aria-label={bookmarked ? '북마크 해제' : '북마크 추가'}
              title={bookmarked ? '북마크 해제' : '북마크 추가'}
            >
              {bookmarked ? '★' : '☆'}
            </button>
          )}
        </div>
        <p className="job-meta">
          {job.company} · {job.is_intern ? '인턴' : '정규'}
        </p>
        {job.statusLabel && (
          <span
            className="status-tag"
            style={{ background: statusStyle.bg, color: statusStyle.text, display: 'inline-block', marginBottom: 14 }}
          >
            {job.statusLabel}
          </span>
        )}
        {job.checklist && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>항목별 충족 여부</p>
            {job.checklist.map((c) => (
              <div className="checklist-row" key={c.category}>
                <div className="checklist-main">
                  <span className="checklist-label">{c.label}</span>
                  <span className={c.ok ? 'ok' : 'no'} style={{ fontSize: 14 }}>
                    {c.ok ? '✓' : '✕'}
                  </span>
                </div>
                <p className={`checklist-detail mono${c.ok ? '' : ' checklist-detail-fail'}`}>{c.detail}</p>
              </div>
            ))}
          </>
        )}
        {job.has_computer_skill !== undefined && (
          <div className="checklist-row checklist-row-reference">
            <div className="checklist-main">
              <span className="checklist-label">컴퓨터활용능력</span>
              <span className="checklist-reference-value">{describeComputerSkill(job.has_computer_skill)}</span>
            </div>
            <p className="checklist-detail">판정에 포함되지 않는 참고 정보예요.</p>
          </div>
        )}
        <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}

export default JobDetailModal
