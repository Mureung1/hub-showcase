import formatDate from '../utils/formatDate'

function RecordCard({ checkin, onSelect }) {
  return (
    <article className="record-card" onClick={() => onSelect && onSelect(checkin)}>
      <time dateTime={checkin.createdAt}>{formatDate(checkin.createdAt)}</time>
      <p className="record-raw">“{checkin.rawText}”</p>
      <dl>
        <div><dt>감정</dt><dd>{checkin.emotion}</dd></div>
        <div><dt>원인</dt><dd>{checkin.cause}</dd></div>
        <div><dt>작은 행동</dt><dd>{checkin.action}</dd></div>
      </dl>
    </article>
  )
}

export default RecordCard
