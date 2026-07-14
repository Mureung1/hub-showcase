import { JOB_CATEGORY_STYLE, DEFAULT_CATEGORY_STYLE, STATUS_STYLE } from '../../constants/resultDisplay'

function JobCard({ job, onClick }) {
  const categoryStyle = JOB_CATEGORY_STYLE[job.job_category] || DEFAULT_CATEGORY_STYLE
  const statusStyle = STATUS_STYLE[job.status] || STATUS_STYLE.match

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
          <div className="job-check">
            {job.checklist.map((c) => (
              <span key={c.category} className={c.ok ? 'ok' : 'no'}>
                {c.ok ? '✓' : '✕'}
              </span>
            ))}
          </div>
        </div>
      </div>
      <span className="status-tag" style={{ background: statusStyle.bg, color: statusStyle.text }}>
        {job.statusLabel}
      </span>
    </button>
  )
}

export default JobCard
