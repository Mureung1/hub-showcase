import { calculateDday } from '../utils/dday'
import DdayBadge from './DdayBadge'
import './NotificationCard.css'

// 완료 버튼은 S2 임시 배치(카드 전체 클릭 아님) — 정식 위치는 S3 "완료로 표시" 버튼,
// S3 React 이관 시 이어붙이고 이 임시 버튼은 제거한다.
function NotificationCard({ notification, onComplete, today }) {
  const { id, title, summary, deadline, priority, source, keywords, done } = notification
  const label = done ? '완료 ✓' : calculateDday(deadline, today)

  return (
    <div className={`card${done ? ' card--done' : ''}`}>
      <div className="card-top">
        {label && <DdayBadge priority={priority} label={label} />}
        <span className="card-src">{source}</span>
        {!done && (
          <button type="button" className="card-complete" onClick={() => onComplete(id)}>
            완료
          </button>
        )}
      </div>
      <div className="card-title">{title}</div>
      {summary && <div className="card-sum">{summary}</div>}
      {keywords?.[0] && <span className="card-kw"># {keywords[0]}</span>}
    </div>
  )
}

export default NotificationCard
