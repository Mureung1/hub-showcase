import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import { formatMeetingSchedule } from '../utils/date.js'
import { fetchPendingEvaluations, submitEvaluations } from '../api/evaluations.js'

// 태그 상수(FE 사본). BE `constants/evaluationTags.js`와 코드·문구가 정확히 같아야 한다.
// 공유 모듈로 빼지 않는 이유: shared/regions.json처럼 폴더 밖 상대경로 import는 배포
// build context 문제를 또 만든다. 어긋나면 서버가 400으로 거절하므로 조용히 틀리지는 않는다.
const POSITIVE_TAGS = [
  { code: 'punctual', label: '시간 약속을 잘 지켜요' },
  { code: 'friendly', label: '분위기를 좋게 만들어요' },
  { code: 'good_talk', label: '대화가 즐거웠어요' },
  { code: 'again', label: '또 만나고 싶어요' },
]
const NEGATIVE_TAGS = [
  { code: 'late', label: '시간 약속을 안 지켰어요' },
  { code: 'rude', label: '예의가 부족했어요' },
  { code: 'different', label: '공지와 달랐어요' },
]
const MAX_TAGS_PER_SIGN = 3

// 질문 문구는 모임 타입 × 내 역할(누구를 평가하는지)에 따라 달라진다(설계 4.2).
function attendanceQuestion(role, type) {
  if (role === 'host') {
    return type === 'flash' ? '이 분이 오셨나요?' : '이 분이 모임에 성실히 참여했나요?'
  }
  return type === 'flash' ? '모임장이 오셨나요?' : '모임장이 모임을 성실히 이끌었나요?'
}

export default function MeetingEvaluatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, authLoading } = useAppState()
  // { meeting, role, targets } | null. 대상 목록에 이 모임이 없으면 null로 남아
  // "평가 기간이 지났어요" 안내로 이어진다.
  const [entry, setEntry] = useState(null)
  // { [rateeId]: { attended: boolean|null, tags: string[] } }
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // GET /api/evaluations/pending은 로그인이 필요하다. 세션 복원(authLoading)이 끝난 뒤에만
  // 조회한다 — MeetingDetailPage와 같은 이유(부트스트랩 전에 부르면 401로 잘못 판정될 수 있다).
  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchPendingEvaluations()
      .then((data) => {
        if (cancelled) return
        const found = data.items.find((item) => item.meeting.id === Number(id))
        if (found) {
          setEntry(found)
          setAnswers(
            Object.fromEntries(found.targets.map((t) => [t.userId, { attended: null, tags: [] }]))
          )
        } else {
          setEntry(null)
        }
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
  }, [id, authLoading, isLoggedIn, reloadKey])

  function setAttended(rateeId, attended) {
    setAnswers((prev) => ({ ...prev, [rateeId]: { ...prev[rateeId], attended } }))
  }

  // 같은 부호(긍정/부정)가 이미 MAX_TAGS_PER_SIGN개면 추가를 무시한다. 이미 선택된
  // 태그를 다시 누르면 개수와 무관하게 해제된다.
  function toggleTag(rateeId, code, signTags) {
    setAnswers((prev) => {
      const current = prev[rateeId] ?? { attended: null, tags: [] }
      if (current.tags.includes(code)) {
        return { ...prev, [rateeId]: { ...current, tags: current.tags.filter((t) => t !== code) } }
      }
      const sameSignCount = current.tags.filter((t) => signTags.some((tag) => tag.code === t)).length
      if (sameSignCount >= MAX_TAGS_PER_SIGN) return prev
      return { ...prev, [rateeId]: { ...current, tags: [...current.tags, code] } }
    })
  }

  if (loading) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 평가" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>불러오는 중…</p>
        </Card>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 평가" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>로그인하면 평가할 모임을 볼 수 있어요.</p>
          <PillButton to="/login" variant="accent" block>
            로그인하러 가기
          </PillButton>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 평가" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>{error}</p>
          <PillButton variant="ghost" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            다시 시도
          </PillButton>
        </Card>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 평가" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>
            평가 기간이 지났거나 평가할 대상이 없어요.
          </p>
          <PillButton to="/mypage" variant="accent" size="sm">
            마이페이지로
          </PillButton>
        </Card>
      </div>
    )
  }

  const { meeting, role, targets } = entry
  const allAttendanceSet = targets.every((t) => answers[t.userId]?.attended != null)

  async function handleSubmit() {
    if (!allAttendanceSet || submitting) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const evaluations = targets.map((t) => ({
        rateeId: t.userId,
        attended: answers[t.userId].attended,
        tags: answers[t.userId].tags,
      }))
      await submitEvaluations(meeting.id, evaluations)
      navigate('/mypage')
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container--narrow">
      <PageHeader
        title={meeting.type === 'flash' ? '번개모임 평가' : '소모임 평가'}
        eyebrow={meeting.title}
      />

      <Card variant="solid">
        <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
          {formatMeetingSchedule(meeting)} · {role === 'host' ? '나는 모임장이었어요' : '나는 참여자였어요'}
        </p>
      </Card>

      {targets.map((t) => {
        const a = answers[t.userId] ?? { attended: null, tags: [] }
        return (
          <Card key={t.userId} variant="solid" className="eval-target">
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t.nickname}</span>
            <span style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>
              {attendanceQuestion(role, meeting.type)}
            </span>

            <div className="eval-attend-group">
              <button
                type="button"
                className={`eval-attend-btn${a.attended === true ? ' is-selected' : ''}`}
                onClick={() => setAttended(t.userId, true)}
              >
                왔어요
              </button>
              <button
                type="button"
                className={`eval-attend-btn${a.attended === false ? ' is-selected' : ''}`}
                onClick={() => setAttended(t.userId, false)}
              >
                안 왔어요
              </button>
            </div>

            <div className="eval-tag-group">
              {POSITIVE_TAGS.map((tag) => {
                const selected = a.tags.includes(tag.code)
                const disabled =
                  !selected &&
                  a.tags.filter((c) => POSITIVE_TAGS.some((p) => p.code === c)).length >= MAX_TAGS_PER_SIGN
                return (
                  <button
                    key={tag.code}
                    type="button"
                    className={`eval-tag eval-tag--positive${selected ? ' is-selected' : ''}`}
                    disabled={disabled}
                    onClick={() => toggleTag(t.userId, tag.code, POSITIVE_TAGS)}
                  >
                    {tag.label}
                  </button>
                )
              })}
            </div>

            <div className="eval-tag-group">
              {NEGATIVE_TAGS.map((tag) => {
                const selected = a.tags.includes(tag.code)
                const disabled =
                  !selected &&
                  a.tags.filter((c) => NEGATIVE_TAGS.some((n) => n.code === c)).length >= MAX_TAGS_PER_SIGN
                return (
                  <button
                    key={tag.code}
                    type="button"
                    className={`eval-tag eval-tag--negative${selected ? ' is-selected' : ''}`}
                    disabled={disabled}
                    onClick={() => toggleTag(t.userId, tag.code, NEGATIVE_TAGS)}
                  >
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </Card>
        )
      })}

      {submitError && <p style={{ fontSize: 13, color: 'var(--warning)' }}>{submitError}</p>}

      <PillButton variant="accent" block disabled={!allAttendanceSet || submitting} onClick={handleSubmit}>
        {submitting ? '제출 중…' : '평가 제출하기'}
      </PillButton>
    </div>
  )
}
