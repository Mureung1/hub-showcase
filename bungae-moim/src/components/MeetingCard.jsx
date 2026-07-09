import { Link } from 'react-router-dom'
import StatusPill from './StatusPill.jsx'
import { meetingStatusMeta } from '../utils/status.js'
import { formatMeetingSchedule } from '../utils/date.js'
import { getConfirmedCount } from '../utils/meetings.js'

export default function MeetingCard({ meeting }) {
  const status = meetingStatusMeta(meeting.status)
  const confirmedCount = getConfirmedCount(meeting)
  const capacityLabel =
    meeting.type === 'flash' ? `${confirmedCount}/${meeting.capacity}명` : `${confirmedCount}명 참여중`

  return (
    <Link to={`/meetings/${meeting.id}`} className="meeting-card">
      <div className="meeting-card-top">
        <span className="eyebrow">{meeting.type === 'flash' ? '번개모임' : '소모임'} · {meeting.category}</span>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <h3 className="meeting-card-title">{meeting.title}</h3>
      <div className="meeting-card-meta">
        <span>📍 {meeting.regionSigungu}</span>
        <span>🗓 {formatMeetingSchedule(meeting)}</span>
      </div>
      <div className="meeting-card-foot">
        <span className="eyebrow">{capacityLabel}</span>
        {meeting.adultOnly && <StatusPill tone="warning">성인만</StatusPill>}
      </div>
    </Link>
  )
}
