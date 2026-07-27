import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import StatusPill from '../components/StatusPill.jsx'
import TrustBadge from '../components/TrustBadge.jsx'
import { meetingStatusMeta, participationStatusMeta, isScheduleEnded } from '../utils/status.js'
import { formatMeetingSchedule } from '../utils/date.js'
import { fetchHostedMeetings, fetchJoinedMeetings } from '../api/users.js'

export default function MyPage() {
  const { currentUser, isLoggedIn, logout } = useAppState()
  const [hosted, setHosted] = useState([])
  const [joined, setJoined] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchHostedMeetings(), fetchJoinedMeetings()])
      .then(([hostedRes, joinedRes]) => {
        if (cancelled) return
        setHosted(hostedRes.items)
        setJoined(joinedRes.items)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, reloadKey])

  // 취소된 모임(hosted)과 취소·거절된 신청(joined)은 활성·내역 어디에도 넣지 않는다.
  // 모임장이 모임을 취소하면 참여자 p.status도 전부 cancelled가 되므로(E5), 참여 쪽은
  // p.status만 봐도 취소된 모임이 걸러진다.
  const hostedActive = hosted.filter((m) => m.status !== 'cancelled' && !isScheduleEnded(m))
  const hostedHistory = hosted.filter((m) => m.status !== 'cancelled' && isScheduleEnded(m))
  const joinedActive = joined.filter(
    (j) => ['pending', 'confirmed', 'approved'].includes(j.status) && !isScheduleEnded(j.meeting)
  )
  const joinedHistory = joined.filter(
    (j) => ['confirmed', 'approved'].includes(j.status) && isScheduleEnded(j.meeting)
  )
  const hasHistory = hostedHistory.length > 0 || joinedHistory.length > 0

  if (!isLoggedIn) {
    return (
      <div className="container--narrow">
        <PageHeader title="마이페이지" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>로그인하면 내가 등록/참여한 모임을 볼 수 있어요.</p>
          <PillButton to="/login" variant="accent" block>
            로그인하러 가기
          </PillButton>
        </Card>
      </div>
    )
  }

  return (
    <div className="container--wide">
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

      {loading && (
        <Card variant="solid">
          <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>불러오는 중…</p>
        </Card>
      )}

      {error && !loading && (
        <Card variant="solid">
          <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>{error}</p>
          <PillButton variant="ghost" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            다시 시도
          </PillButton>
        </Card>
      )}

      {!loading && !error && (
        <>
          <h2 className="section-title" style={{ fontSize: 16 }}>
            내가 등록한 모임 ({hostedActive.length})
          </h2>

          {hostedActive.length === 0 && (
            <Card variant="solid">
              <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>진행 중이거나 예정된 모임이 없어요.</p>
            </Card>
          )}

          {hostedActive.length > 0 && (
            <div className="card-grid--2">
              {hostedActive.map((m) => (
                <HostedCard key={m.id} m={m} />
              ))}
            </div>
          )}

          <h2 className="section-title" style={{ fontSize: 16 }}>
            참여한 모임 ({joinedActive.length})
          </h2>

          {joinedActive.length === 0 && (
            <Card variant="solid">
              <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>진행 중이거나 예정된 신청이 없어요.</p>
            </Card>
          )}

          {joinedActive.length > 0 && (
            <div className="card-grid--2">
              {joinedActive.map((j) => (
                <JoinedCard key={j.meeting.id} meeting={j.meeting} status={j.status} />
              ))}
            </div>
          )}

          {hasHistory && (
            <>
              <h2 className="section-title" style={{ fontSize: 16 }}>
                모임 내역 ({hostedHistory.length + joinedHistory.length})
              </h2>

              {hostedHistory.length > 0 && (
                <>
                  <span className="eyebrow">내가 만든 모임</span>
                  <div className="card-grid--2">
                    {hostedHistory.map((m) => (
                      <HostedCard key={m.id} m={m} />
                    ))}
                  </div>
                </>
              )}

              {joinedHistory.length > 0 && (
                <>
                  <span className="eyebrow">참여한 모임</span>
                  <div className="card-grid--2">
                    {joinedHistory.map((j) => (
                      <JoinedCard key={j.meeting.id} meeting={j.meeting} status={j.status} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function HostedCard({ m }) {
  const status = meetingStatusMeta(m.status)
  return (
    <Link to={`/meetings/${m.id}`} className="meeting-card">
      <div className="meeting-card-top">
        <span className="eyebrow">
          {m.type === 'flash' ? '번개모임' : '소모임'} · {formatMeetingSchedule(m)}
        </span>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <h3 className="meeting-card-title">{m.title}</h3>
      <span className="eyebrow">신청자 {m.applicantCount}명</span>
      {m.pendingCount > 0 && <StatusPill tone="warning">승인 대기 {m.pendingCount}건</StatusPill>}
    </Link>
  )
}

function JoinedCard({ meeting, status }) {
  const meta = participationStatusMeta(status)
  return (
    <Link to={`/meetings/${meeting.id}`} className="meeting-card">
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
}
