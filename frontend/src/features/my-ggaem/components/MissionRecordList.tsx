import type { MissionRecordListItem } from '../../../api/types'
import { MISSION_TYPE_LABEL, URL_STATUS_NOTICE } from '../../../shared/domain/labels'
import ErrorState from '../../../shared/ui/ErrorState/ErrorState'
import type { RecordsState } from '../types'

const KST_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function MissionRecordCard({ item }: { item: MissionRecordListItem }) {
  return (
    <article className="card myggaem-record-card">
      <div className="myggaem-record-card-header">
        <span className={`myggaem-mission-type myggaem-mission-type--${item.missionType}`}>
          {MISSION_TYPE_LABEL[item.missionType]}
        </span>
        <span className="myggaem-record-date">
          {KST_TIME_FORMATTER.format(new Date(item.createdAt))}
        </span>
      </div>
      <p className="card-meta">{item.sourceName}</p>
      <h2 className="myggaem-record-title">{item.articleTitle}</h2>
      <div className="myggaem-record-tags">
        {item.interestTags.map((tag) => (
          <span key={tag.id} className="topic-tag">{tag.name}</span>
        ))}
      </div>
      <p className="myggaem-record-prompt">{item.missionPrompt}</p>
      <p className="myggaem-record-answer">{item.userAnswer}</p>
      {item.urlStatus === 'active' ? (
        <a className="card-link" href={item.originalUrl} target="_blank" rel="noreferrer">
          원문 다시 보기
        </a>
      ) : (
        <>
          <p className="myggaem-record-url-notice">{URL_STATUS_NOTICE[item.urlStatus]}</p>
          <button type="button" className="card-link" disabled>원문 다시 보기</button>
        </>
      )}
    </article>
  )
}

export default function MissionRecordList({ state }: { state: RecordsState }) {
  if (state.status === 'loading') return <p role="status">기록을 불러오고 있어요...</p>
  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={state.onRetry} />
  }
  if (state.items.length === 0) return <p>이 날짜에는 기록이 없어요.</p>

  return (
    <section className="myggaem-records">
      {state.items.map((item) => <MissionRecordCard key={item.id} item={item} />)}
    </section>
  )
}
