import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import StatusPill from '../components/StatusPill.jsx'
import TrustBadge from '../components/TrustBadge.jsx'
import { meetingStatusMeta, participationStatusMeta } from '../utils/status.js'
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
            내가 등록한 모임 ({hosted.length})
          </h2>

          {hosted.length === 0 && (
            <Card variant="solid">
              <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>아직 등록한 모임이 없어요.</p>
            </Card>
          )}

          {hosted.map((m) => {
            const status = meetingStatusMeta(m.status)
            return (
              <Link key={m.id} to={`/meetings/${m.id}`} className="meeting-card">
                <div className="meeting-card-top">
                  <span className="eyebrow">
                    {m.type === 'flash' ? '번개모임' : '소모임'} · {formatMeetingSchedule(m)}
                  </span>
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </div>
                <h3 className="meeting-card-title">{m.title}</h3>
                {m.pendingCount > 0 && <StatusPill tone="warning">승인 대기 {m.pendingCount}건</StatusPill>}
              </Link>
            )
          })}

          <h2 className="section-title" style={{ fontSize: 16 }}>
            참여한 모임 ({joined.length})
          </h2>

          {joined.length === 0 && (
            <Card variant="solid">
              <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>아직 신청한 모임이 없어요.</p>
            </Card>
          )}

          {joined.map(({ meeting, status }) => {
            const meta = participationStatusMeta(status)
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
      )}
    </>
  )
}
