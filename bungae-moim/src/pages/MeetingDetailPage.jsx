import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import StatusPill from '../components/StatusPill.jsx'
import TrustBadge from '../components/TrustBadge.jsx'
import { meetingStatusMeta, participationStatusMeta, blockReasonLabel, isMeetingEnded } from '../utils/status.js'
import { formatMeetingSchedule } from '../utils/date.js'
import { getPendingApplicants, countActiveApplicants } from '../utils/meetings.js'
import {
  fetchMeeting,
  applyToMeeting,
  cancelParticipation,
  fetchParticipants,
  respondToApplicant,
  deleteMeeting,
} from '../api/meetings.js'

export default function MeetingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentUser,
    isLoggedIn,
    authLoading,
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
  const [participants, setParticipants] = useState([])
  const [participantsError, setParticipantsError] = useState(null)
  const [participantsReloadKey, setParticipantsReloadKey] = useState(0)
  // 승인 응답을 기다리는 동안 그 사람의 버튼 두 개를 모두 잠근다. 승인 직후 거절이 눌리면
  // 두 번째 요청이 "이미 처리된 신청입니다"로 실패해 사용자에게 혼란스러운 에러가 뜬다.
  const [respondingUserId, setRespondingUserId] = useState(null)

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

  // E5(모임 취소, 모임장). 성공하면 목록으로 이동한다 — 취소된 모임은 활성 목록에서 사라진다.
  async function handleCancelMeeting() {
    setActionError(null)
    try {
      await deleteMeeting(id)
      navigate('/meetings')
    } catch (err) {
      setActionError(err.message)
      setConfirmingCancel(false)
    }
  }

  // 아래 effect가 Hooks 규칙을 지키려면 조기 return(로딩/에러)보다 위에서 계산해야 한다.
  // meeting이 아직 null일 수 있으므로 가드가 필수다. currentUser는 비로그인일 때
  // GUEST_USER(id: null)가 들어오도록 Context가 이미 방어하고 있어 가드가 필요 없다.
  const isHost = meeting ? meeting.host.id === currentUser.id : false

  // 승인/거절(F4). 성공하면 신청자 목록과 상세를 모두 재조회한다 — 상세의 confirmedCount가
  // approved를 세므로 승인하면 값이 달라진다.
  async function handleRespond(userId, status) {
    setRespondingUserId(userId)
    try {
      await respondToApplicant(id, userId, status)
      setParticipantsReloadKey((k) => k + 1)
      setReloadKey((k) => k + 1)
    } catch (err) {
      // 알림창으로 띄운다. 이 실패는 모임장이 방금 누른 버튼에 대한 답이라 놓치면 안 되는데,
      // 카드 안 문구로 두면 신청자 목록 아래에 작게 붙어 클릭 지점에서 멀고 눈에 안 띈다.
      window.alert(err.message)
      // 실패 원인이 대부분 "그 사이 신청자 상태가 바뀜"(예: 신청자가 방금 취소)이라,
      // 신청자 목록을 서버 진실로 다시 맞춰야 모임장이 낡은 화면을 보고 같은 버튼을
      // 반복해서 누르는 걸 막는다.
      setParticipantsReloadKey((k) => k + 1)
    } finally {
      setRespondingUserId(null)
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

  // 신청자 목록(F3)은 모임장에게만, 소모임에서만 필요하다. 상세가 로드돼야 모임장 여부를
  // 알 수 있으므로 meeting을 기다린다.
  // deps에 meeting 객체 대신 id/type을 쓰는 이유: 승인 후 상세를 재조회하면 객체 정체성이
  // 바뀌는데, 객체를 넣으면 신청자 목록을 불필요하게 한 번 더 조회하게 된다.
  useEffect(() => {
    if (!isHost || meeting?.type !== 'small') {
      setParticipants([])
      return
    }

    let cancelled = false
    setParticipantsError(null)

    fetchParticipants(id)
      .then((data) => {
        if (cancelled) return
        setParticipants(data.items)
      })
      .catch((err) => {
        if (cancelled) return
        // 목록 조회 실패로 상세 페이지 전체를 에러 화면으로 만들지 않는다. 카드 안에만 알린다.
        setParticipantsError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [id, isHost, meeting?.type, participantsReloadKey])

  if (loading) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 정보를 불러오는 중" />
        <Card variant="solid">
          <p style={{ color: 'var(--ink-mute)', fontSize: 13.5 }}>잠시만 기다려 주세요.</p>
        </Card>
      </div>
    )
  }

  if (error || !meeting) {
    // NOT_FOUND(서버가 "그런 모임 없음"이라고 명시적으로 답한 경우)만 "모임을 찾을 수 없어요"로
    // 보여준다. 그 외(네트워크 오류, 500 등)는 모임이 없다는 뜻이 아니므로 다르게 안내하고,
    // 새로고침 말고도 빠져나갈 수 있게 다시 시도 버튼을 준다.
    const isNotFound = errorCode === 'NOT_FOUND'
    return (
      <div className="container--narrow">
        <PageHeader title={isNotFound ? '모임을 찾을 수 없어요' : '일시적인 오류예요'} />
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
      </div>
    )
  }

  const status = meetingStatusMeta(meeting.status)
  const confirmedCount = meeting.confirmedCount
  const myParticipation = meeting.myParticipation
  const pendingApplicants = getPendingApplicants(participants)
  const isEnded = isMeetingEnded(meeting)
  // 서버가 openChatUrl을 내려줬다는 것 자체가 "볼 자격이 있다"는 뜻이다(E3에서 판단).
  const canSeeOpenChat = Boolean(meeting.openChatUrl)

  return (
    <div className="container--wide">
      <PageHeader title={meeting.type === 'flash' ? '번개모임' : '소모임'} eyebrow={meeting.category} />

      <div className="detail-layout">
        <div className="detail-main">
          <Card variant="solid">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <h2 className="section-title" style={{ fontSize: 24, textWrap: 'balance' }}>
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
              <span>📍 {meeting.regionSigungu}</span>
              <span>
                👥 {meeting.type === 'flash' ? `${confirmedCount}/${meeting.capacity}명 확정` : `${confirmedCount}명 참여중 (정원 없음)`}
              </span>
              {meeting.adultOnly && <StatusPill tone="warning">성인만 참여 가능</StatusPill>}
            </div>

            <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink)' }}>{meeting.description}</p>
          </Card>

          {isLoggedIn && isHost && meeting.type === 'small' && (
            <Card variant="solid">
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                신청자 {countActiveApplicants(participants)}명 · 대기중 {pendingApplicants.length}명
              </span>

              {participantsError && (
                <span style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
                  신청자 목록을 불러오지 못했어요. {participantsError}
                </span>
              )}

              {/* 빈 상태는 목록 자체가 비었을 때만. 위 카운트는 취소·거절을 빼므로,
                  카운트 기준으로 판단하면 "신청자가 없어요" 아래에 사람이 깔린다. */}
              {!participantsError && participants.length === 0 && (
                <span style={{ fontSize: 13, color: 'var(--ink-mute)' }}>아직 신청자가 없어요.</span>
              )}

              {participants.map((p) => {
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
                      borderBottom: '1px solid var(--line)',
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
                          disabled={respondingUserId === p.userId}
                          onClick={() => handleRespond(p.userId, 'approved')}
                        >
                          승인
                        </PillButton>
                        <PillButton
                          variant="ghost"
                          size="sm"
                          disabled={respondingUserId === p.userId}
                          onClick={() => handleRespond(p.userId, 'rejected')}
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
            </Card>
          )}

          <PillButton variant="ghost" size="sm" onClick={() => navigate('/meetings')}>
            ← 목록으로
          </PillButton>
        </div>

        <aside className="detail-aside">
          <Card variant="solid">
            <div className="eyebrow">참여 인원</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="display-number" style={{ fontSize: 30, color: 'var(--accent)' }}>
                {confirmedCount}
              </span>
              <span style={{ fontSize: 14, color: 'var(--ink-mute)' }}>
                {meeting.type === 'flash' ? `/ ${meeting.capacity}명` : '명 참여중'}
              </span>
            </div>
            {meeting.type === 'flash' && (
              <div className="detail-capacity-bar">
                <div
                  className="detail-capacity-fill"
                  style={{ width: `${Math.min(100, (confirmedCount / meeting.capacity) * 100)}%` }}
                />
              </div>
            )}
          </Card>

          {!isLoggedIn && (
            <Card variant="solid">
              <div className="eyebrow">참여하려면 로그인하세요</div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>로그인 후 참여 신청과 오픈채팅 링크를 확인할 수 있어요.</p>
              <PillButton to="/login" variant="accent" block>
                로그인하러 가기
              </PillButton>
            </Card>
          )}

          {isLoggedIn && isHost && (
            <Card variant="solid">
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

              {!isEnded && !confirmingCancel && (
                <PillButton to={`/meetings/${id}/edit`} variant="ghost" size="sm">
                  모임 수정하기
                </PillButton>
              )}

              {!isEnded && !confirmingCancel && (
                <PillButton variant="ghost" size="sm" onClick={() => setConfirmingCancel(true)}>
                  모임 취소하기
                </PillButton>
              )}

              {!isEnded && confirmingCancel && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
                    정말 취소할까요? 참여자 전원에게 취소로 표시돼요.
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PillButton variant="accent" size="sm" onClick={handleCancelMeeting}>
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
            <Card variant="solid">
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
                    <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>
                      모임장이 확인할 때까지 대기 상태로 유지돼요. 별도 알림은 없으니 마이페이지에서 확인해주세요.
                    </p>
                  )}

                  {!isEnded && (
                    <PillButton variant="ghost" size="sm" onClick={handleCancelParticipation}>
                      신청 취소하기
                    </PillButton>
                  )}
                </>
              ) : meeting.canApply ? (
                // 신청 가능: 버튼. 서버가 canApply로 판정했으므로 FE는 그대로 따른다.
                <PillButton variant="accent" block onClick={handleApply}>
                  {meeting.type === 'flash' ? '참여 신청하기' : '참여 신청하기 (모임장 승인 필요)'}
                </PillButton>
              ) : (
                // 신청 불가: 서버 blockReason에 맞는 안내 문구.
                <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>
                  {blockReasonLabel(meeting.blockReason)}
                </p>
              )}

              {actionError && (
                <p style={{ fontSize: 13, color: 'var(--warning)' }}>{actionError}</p>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
