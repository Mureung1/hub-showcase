import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import StatusPill from '../components/StatusPill.jsx'
import TrustBadge from '../components/TrustBadge.jsx'
import { meetingStatusMeta, participationStatusMeta, blockReasonLabel } from '../utils/status.js'
import { formatMeetingSchedule } from '../utils/date.js'
import { getPendingApplicants } from '../utils/meetings.js'
import { fetchMeeting, applyToMeeting, cancelParticipation } from '../api/meetings.js'

export default function MeetingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentUser,
    isLoggedIn,
    authLoading,
    respondToApplicant,
    cancelMeeting,
  } = useAppState()

  // 훅은 조기 return보다 앞에서 무조건 호출해야 한다(React Hooks 규칙).
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  // 다시 시도 버튼을 누르면 이 값을 올려서 effect를 재실행시킨다(조회 로직을 그대로 재사용).
  const [reloadKey, setReloadKey] = useState(0)

  const [actionError, setActionError] = useState(null)

  // 신청/취소는 서버에 반영한 뒤 reloadKey를 올려 상세를 재조회한다. 번개모임은 신청 즉시
  // confirmed가 되어 openChatUrl이 새로 내려오므로 재조회가 필수다.
  async function handleApply() {
    setActionError(null)
    try {
      await applyToMeeting(id)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleCancelParticipation() {
    setActionError(null)
    try {
      await cancelParticipation(id)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(err.message)
    }
  }

  // 상세 응답은 로그인 사용자 기준으로 개인화된다(myParticipation, openChatUrl).
  // 그래서 세션 복원이 끝나기 전에 부르면 비로그인 기준 응답을 받게 된다 — authLoading이
  // 끝난 뒤에만 조회하고, 로그인 상태가 바뀌면 다시 조회한다.
  useEffect(() => {
    if (authLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setErrorCode(null)

    fetchMeeting(id)
      .then((data) => {
        if (cancelled) return
        setMeeting(data)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        // client.js가 서버 에러 코드를 error.code에 실어준다(네트워크 실패면 undefined).
        // NOT_FOUND인지 아닌지로 "모임이 없음"과 "일시적 오류"를 구분해야 한다.
        setErrorCode(err.code)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, authLoading, isLoggedIn, reloadKey])

  if (loading) {
    return (
      <>
        <PageHeader title="모임 정보를 불러오는 중" back />
        <Card variant="solid">
          <p style={{ color: 'var(--ink-mute)', fontSize: 13.5 }}>잠시만 기다려 주세요.</p>
        </Card>
      </>
    )
  }

  if (error || !meeting) {
    // NOT_FOUND(서버가 "그런 모임 없음"이라고 명시적으로 답한 경우)만 "모임을 찾을 수 없어요"로
    // 보여준다. 그 외(네트워크 오류, 500 등)는 모임이 없다는 뜻이 아니므로 다르게 안내하고,
    // 새로고침 말고도 빠져나갈 수 있게 다시 시도 버튼을 준다.
    const isNotFound = errorCode === 'NOT_FOUND'
    return (
      <>
        <PageHeader title={isNotFound ? '모임을 찾을 수 없어요' : '일시적인 오류예요'} back />
        <Card variant="solid">
          <p style={{ color: 'var(--ink-mute)', fontSize: 13.5 }}>
            {isNotFound ? '삭제되었거나 존재하지 않는 모임이에요.' : '잠시 후 다시 시도해주세요.'}
          </p>
          {!isNotFound && (
            <PillButton variant="accent" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              다시 시도
            </PillButton>
          )}
        </Card>
      </>
    )
  }

  const status = meetingStatusMeta(meeting.status)
  const confirmedCount = meeting.confirmedCount
  const myParticipation = meeting.myParticipation
  const pendingApplicants = getPendingApplicants(meeting)
  const isHost = meeting.host.id === currentUser.id
  const isEnded = meeting.status === 'finished' || meeting.status === 'cancelled'
  // 서버가 openChatUrl을 내려줬다는 것 자체가 "볼 자격이 있다"는 뜻이다(E3에서 판단).
  const canSeeOpenChat = Boolean(meeting.openChatUrl)

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
                신청자 {(meeting.participants ?? []).length}명 · 대기중 {pendingApplicants.length}명
              </span>
              {(meeting.participants ?? []).length === 0 && (
                <span style={{ fontSize: 13, color: 'var(--cream-mute)' }}>아직 신청자가 없어요.</span>
              )}
              {(meeting.participants ?? []).map((p) => {
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

          {!isEnded && !confirmingCancel && (
            <PillButton variant="ghost" size="sm" onClick={() => setConfirmingCancel(true)}>
              모임 취소하기
            </PillButton>
          )}

          {!isEnded && confirmingCancel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--cream-mute)' }}>
                정말 취소할까요? 참여자 전원에게 취소로 표시돼요.
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <PillButton
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    cancelMeeting(meeting.id)
                    setConfirmingCancel(false)
                  }}
                >
                  네, 취소할게요
                </PillButton>
                <PillButton variant="ghost" size="sm" onClick={() => setConfirmingCancel(false)}>
                  아니요
                </PillButton>
              </div>
            </div>
          )}
        </Card>
      )}

      {isLoggedIn && !isHost && (
        <Card variant="dark">
          <div className="eyebrow">참여 신청</div>

          {myParticipation && ['pending', 'confirmed', 'approved'].includes(myParticipation.status) ? (
            // 이미 참여 중: 상태 + (자격 되면) 오픈채팅 + 취소 버튼
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

              <PillButton variant="ghost" size="sm" onClick={handleCancelParticipation}>
                신청 취소하기
              </PillButton>
            </>
          ) : meeting.canApply ? (
            // 신청 가능: 버튼. 서버가 canApply로 판정했으므로 FE는 그대로 따른다.
            <PillButton variant="accent" block onClick={handleApply}>
              {meeting.type === 'flash' ? '참여 신청하기' : '참여 신청하기 (모임장 승인 필요)'}
            </PillButton>
          ) : (
            // 신청 불가: 서버 blockReason에 맞는 안내 문구.
            <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>
              {blockReasonLabel(meeting.blockReason)}
            </p>
          )}

          {actionError && (
            <p style={{ fontSize: 13, color: 'var(--danger, #ffb4a2)' }}>{actionError}</p>
          )}
        </Card>
      )}

      <PillButton variant="ghost" size="sm" onClick={() => navigate('/meetings')}>
        ← 목록으로
      </PillButton>
    </>
  )
}
