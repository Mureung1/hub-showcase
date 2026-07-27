function RecordCard({ checkin, onSelect }) {
  const date = new Date(checkin.createdAt)

  return (
    <button className="history-row" type="button" onClick={() => onSelect && onSelect(checkin)}>
      <span className="date">{date.getMonth() + 1}/{date.getDate()}</span>
      <span className="icon" aria-hidden="true">{checkin.mood || '🙂'}</span>
      <span className="emotion">{checkin.emotion || 'AI 정리 전 기록'}</span>
      {checkin.imageUrl && <span className="photo-flag" aria-label="사진 첨부됨">📷</span>}
    </button>
  )
}

export default RecordCard
