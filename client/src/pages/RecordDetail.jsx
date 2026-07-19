import formatDate from '../utils/formatDate'

const DETAIL_FIELDS = [
  { key: 'emotion', icon: '🙂', title: '오늘의 감정' },
  { key: 'cause', icon: '🔍', title: '감정이 남은 원인' },
  { key: 'action', icon: '🌱', title: '내일의 작은 행동' },
]

function RecordDetail({ checkin, onBack }) {
  return (
    <section className="result-panel">
      <div className="result-meta">
        <p className="eyebrow">기록 상세</p>
        <time dateTime={checkin.createdAt}>
          {checkin.mood ? `${checkin.mood} ` : ''}{formatDate(checkin.createdAt)}
        </time>
      </div>
      <h2>그날 남긴 기록이에요.</h2>
      <p className="record-raw">“{checkin.rawText}”</p>
      <div className="summary-grid">
        {DETAIL_FIELDS.map(({ key, icon, title }) => (
          <div className="summary-card" key={key}>
            <span className="summary-title"><span aria-hidden="true">{icon}</span>{title}</span>
            <p className="summary-text">{checkin[key]}</p>
          </div>
        ))}
      </div>
      <div className="result-actions">
        <button className="button button-secondary" type="button" onClick={onBack}>목록으로</button>
      </div>
    </section>
  )
}

export default RecordDetail
