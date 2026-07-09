import { useParams, useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import StatusPill from '../components/StatusPill.jsx'
import TrustBadge from '../components/TrustBadge.jsx'
import { meetingStatusMeta, participationStatusMeta } from '../utils/status.js'
import { formatMeetingSchedule, isAdultBirthDate } from '../utils/date.js'
import { getConfirmedCount, getMyParticipation, getPendingApplicants } from '../utils/meetings.js'

export default function MeetingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    meetings,
    currentUser,
    isLoggedIn,
    applyToMeeting,
    cancelMyParticipation,
    respondToApplicant,
    cancelMeeting,
  } = useAppState()

  const meeting = meetings.find((m) => m.id === id)

  if (!meeting) {
    return (
      <>
        <PageHeader title="모임을 찾을 수 없어요" back />
        <Card variant="solid">
          <p style={{ color: 'var(--ink-mute)', fontSize: 13.5 }}>삭제되었거나 존재하지 않는 모임이에요.</p>
        </Card>
      </>
    )
  }

  const status = meetingStatusMeta(meeting.status)
  const confirmedCount = getConfirmedCount(meeting)
  const myParticipation = getMyParticipation(meeting, currentUser.id)
  const pendingApplicants = getPendingApplicants(meeting)
  const isHost = meeting.host.id === currentUser.id
  const isEnded = meeting.status === 'finished' || meeting.status === 'cancelled'
  const canSeeOpenChat = isHost || myParticipation?.status === 'confirmed' || myParticipation?.status === 'approved'
  const userIsAdult = isAdultBirthDate(currentUser.birthDate)

  return (
    <>
      <PageHeader title={meeting.type === 'flash' ? '번개모임' : '소모임'} eyebrow={meeting.category} back />

      <Card variant="solid">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h2 className="section-title" style={{ fontSize: 20, textWrap: 'balance' }}>
            {meeting.title}
          </h2>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{meeting.host.nickname}</span>
          <TrustBadge score={meeting.host.trustScore} />
          {isHost && <StatusPill tone="accent">내가 만든 모임</StatusPill>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: 'var(--ink-mute)' }}>
          <span>🗓 {formatMeetingSchedule(meeting)}</span>
          <span>
            📍 {meeting.regionSigungu} {meeting.regionEupmyeondong ?? ''}
          </span>
          <span>
            👥 {meeting.type === 'flash' ? `${confirmedCount}/${meeting.capacity}명 확정` : `${confirmedCount}명 참여중 (정원 없음)`}
          </span>
          {meeting.adultOnly && <StatusPill tone="warning">성인만 참여 가능</StatusPill>}
        </div>

        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>{meeting.description}</p>
      </Card>

      {!isLoggedIn && (
        <Card variant="dark">
          <div className="eyebrow">참여하려면 로그인하세요</div>
          <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>로그인 후 참여 신청과 오픈채팅 링크를 확인할 수 있어요.</p>
          <PillButton to="/login" variant="accent" block>
            로그인하러 가기
          </PillButton>
        </Card>
      )}

      {isLoggedIn && isHost && (
        <Card variant="dark">
          <div className="eyebrow">모임장 관리</div>

          {canSeeOpenChat && (
            <a
              href={meeting.openChatUrl}
              target="_blank"
              rel="noreferrer"
              className="pill-btn pill-btn--accent pill-btn--block"
            >
              오픈채팅 열기
            </a>
          )}

          {meeting.type === 'small' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--cream-mute)' }}>
                신청자 {meeting.participants.length}명 · 대기중 {pendingApplicants.length}명
              </span>
              {meeting.participants.length === 0 && (
                <span style={{ fontSize: 13, color: 'var(--cream-mute)' }}>아직 신청자가 없어요.</span>
              )}
              {meeting.participants.map((p) => {
                const meta = participationStatusMeta(p.status)
                return (
                  <div
                    key={p.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      paddingBottom: 10,
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{p.nickname}</span>
                      <TrustBadge score={p.trustScore} />
                    </div>
                    {p.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <PillButton
                          variant="accent"
                          size="sm"
                          onClick={() => respondToApplicant(meeting.id, p.userId, 'approved')}
                        >
                          승인
                        </PillButton>
                        <PillButton
                          variant="ghost"
                          size="sm"
                          onClick={() => respondToApplicant(meeting.id, p.userId, 'rejected')}
                        >
                          거절
                        </PillButton>
                      </div>
                    ) : (
                      <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!isEnded && (
            <PillButton
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('정말 이 모임을 취소할까요? 참여자 전원에게 취소로 표시됩니다.')) {
                  cancelMeeting(meeting.id)
                }
              }}
            >
              모임 취소하기
            </PillButton>
          )}
        </Card>
      )}

      {isLoggedIn && !isHost && (
        <Card variant="dark">
          <div className="eyebrow">참여 신청</div>

          {isEnded && (
            <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>
              {meeting.status === 'cancelled' ? '모임장이 취소한 모임이에요.' : '이미 종료된 모임이에요.'}
            </p>
          )}

          {!isEnded && meeting.adultOnly && !userIsAdult && (
            <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>성인만 참여 가능한 모임이에요.</p>
          )}

          {!isEnded && (!meeting.adultOnly || userIsAdult) && (
            <>
              {(!myParticipation || myParticipation.status === 'cancelled') && (
                <>
                  {meeting.status === 'closed' ? (
                    <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>정원이 가득 찼어요.</p>
                  ) : (
                    <PillButton variant="accent" block onClick={() => applyToMeeting(meeting.id)}>
                      {meeting.type === 'flash' ? '참여 신청하기' : '참여 신청하기 (모임장 승인 필요)'}
                    </PillButton>
                  )}
                </>
              )}

              {myParticipation && myParticipation.status !== 'cancelled' && (
                <>
                  <StatusPill tone={participationStatusMeta(myParticipation.status).tone}>
                    {participationStatusMeta(myParticipation.status).label}
                  </StatusPill>

                  {canSeeOpenChat && (
                    <a
                      href={meeting.openChatUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="pill-btn pill-btn--accent pill-btn--block"
                    >
                      오픈채팅 열기
                    </a>
                  )}

                  {myParticipation.status === 'pending' && (
                    <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>
                      모임장이 확인할 때까지 대기 상태로 유지돼요. 별도 알림은 없으니 마이페이지에서 확인해주세요.
                    </p>
                  )}

                  {myParticipation.status === 'rejected' && (
                    <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>아쉽지만 이번 신청은 거절됐어요.</p>
                  )}

                  <PillButton variant="ghost" size="sm" onClick={() => cancelMyParticipation(meeting.id)}>
                    신청 취소하기
                  </PillButton>
                </>
              )}
            </>
          )}
        </Card>
      )}

      <PillButton variant="ghost" size="sm" onClick={() => navigate('/meetings')}>
        ← 목록으로
      </PillButton>
    </>
  )
}
