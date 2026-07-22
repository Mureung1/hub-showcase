import { Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import StatusPill from '../components/StatusPill.jsx'
import TrustBadge from '../components/TrustBadge.jsx'
import { meetingStatusMeta, participationStatusMeta } from '../utils/status.js'
import { formatMeetingSchedule } from '../utils/date.js'
import { getPendingApplicants } from '../utils/meetings.js'

export default function MyPage() {
  const { meetings, currentUser, isLoggedIn, logout } = useAppState()

  if (!isLoggedIn) {
    return (
      <>
        <PageHeader title="마이페이지" back />
        <Card variant="dark">
          <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>로그인하면 내가 등록/참여한 모임을 볼 수 있어요.</p>
          <PillButton to="/login" variant="accent" block>
            로그인하러 가기
          </PillButton>
        </Card>
      </>
    )
  }

  const hostedMeetings = meetings.filter((m) => m.host.id === currentUser.id)
  const joinedMeetings = meetings
    .map((m) => ({ meeting: m, participation: m.participants.find((p) => p.userId === currentUser.id) }))
    .filter((entry) => entry.participation)

  return (
    <>
      <PageHeader title="마이페이지" />

      <Card variant="dark">
        <div className="eyebrow">내 프로필</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="section-title" style={{ fontSize: 22 }}>
            {currentUser.nickname}
          </span>
          <TrustBadge score={currentUser.trustScore} />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--cream-mute)' }}>
          신뢰도는 모든 사용자에게 공개되며, 소모임 모임장의 승인 판단 등에 참고돼요.
        </p>
        <PillButton variant="ghost" size="sm" onClick={logout}>
          로그아웃
        </PillButton>
      </Card>

      <h2 className="section-title" style={{ fontSize: 16 }}>
        내가 등록한 모임 ({hostedMeetings.length})
      </h2>

      {hostedMeetings.length === 0 && (
        <Card variant="solid">
          <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>아직 등록한 모임이 없어요.</p>
        </Card>
      )}

      {hostedMeetings.map((m) => {
        const status = meetingStatusMeta(m.status)
        const pending = getPendingApplicants(m.participants)
        return (
          <Link key={m.id} to={`/meetings/${m.id}`} className="meeting-card">
            <div className="meeting-card-top">
              <span className="eyebrow">
                {m.type === 'flash' ? '번개모임' : '소모임'} · {formatMeetingSchedule(m)}
              </span>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
            <h3 className="meeting-card-title">{m.title}</h3>
            {pending.length > 0 && <StatusPill tone="warning">승인 대기 {pending.length}건</StatusPill>}
          </Link>
        )
      })}

      <h2 className="section-title" style={{ fontSize: 16 }}>
        참여한 모임 ({joinedMeetings.length})
      </h2>

      {joinedMeetings.length === 0 && (
        <Card variant="solid">
          <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>아직 신청한 모임이 없어요.</p>
        </Card>
      )}

      {joinedMeetings.map(({ meeting, participation }) => {
        const meta = participationStatusMeta(participation.status)
        return (
          <Link key={meeting.id} to={`/meetings/${meeting.id}`} className="meeting-card">
            <div className="meeting-card-top">
              <span className="eyebrow">
                {meeting.type === 'flash' ? '번개모임' : '소모임'} · {formatMeetingSchedule(meeting)}
              </span>
              <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
            </div>
            <h3 className="meeting-card-title">{meeting.title}</h3>
            <span className="eyebrow">모임장 {meeting.host.nickname}</span>
          </Link>
        )
      })}
    </>
  )
}
