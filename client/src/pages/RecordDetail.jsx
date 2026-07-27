import formatDate from '../utils/formatDate'

const DETAIL_FIELDS = [
  { key: 'emotion', icon: '🙂', title: '오늘의 감정' },
  { key: 'cause', icon: '🔍', title: '감정이 남은 원인' },
  { key: 'action', icon: '🌱', title: '내일의 작은 행동' },
]

function RecordDetail({ checkin, onBack, onDelete }) {
  const hasSummary = DETAIL_FIELDS.some(({ key }) => checkin[key])

  function handleDelete() {
    if (window.confirm('이 기록을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) {
      onDelete(checkin.id)
    }
  }

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
      {checkin.imageUrl && (
        <img className="record-photo" src={checkin.imageUrl} alt="기록에 첨부한 사진" />
      )}
      {hasSummary ? (
        <div className="summary-grid">
          {DETAIL_FIELDS.map(({ key, icon, title }) => checkin[key] && (
            <div className="summary-card" key={key}>
              <span className="summary-title"><span aria-hidden="true">{icon}</span>{title}</span>
              <p className="summary-text">{checkin[key]}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="unorganized-note">AI 정리 없이 저장한 기록이에요.</p>
      )}
      <div className="result-actions">
        <button className="button button-secondary" type="button" onClick={onBack}>목록으로</button>
        <button className="button button-danger" type="button" onClick={handleDelete}>삭제</button>
      </div>
    </section>
  )
}

export default RecordDetail
