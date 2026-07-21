import DdayBadge from './DdayBadge'
import './NotificationCard.css'

// ddayLabel은 임시 필드 — deadline에서 D-day 문구를 계산하는 로직은 이후 task에서 구현
function NotificationCard({ notification }) {
  const { title, summary, priority, source, keywords, done, ddayLabel } = notification

  return (
    <div className={`card${done ? ' card--done' : ''}`}>
      <div className="card-top">
        <DdayBadge priority={priority} label={ddayLabel} />
        <span className="card-src">{source}</span>
      </div>
      <div className="card-title">{title}</div>
      {summary && <div className="card-sum">{summary}</div>}
      {keywords?.[0] && <span className="card-kw"># {keywords[0]}</span>}
    </div>
  )
}

export default NotificationCard
