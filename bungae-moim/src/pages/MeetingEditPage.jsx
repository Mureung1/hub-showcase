import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import MeetingForm from '../components/MeetingForm.jsx'
import { defaultFormValues } from '../utils/meetingFormDefaults.js'
import { fetchMeeting, updateMeeting } from '../api/meetings.js'
import { isMeetingEnded } from '../utils/status.js'

// timestamp(타임존 없음) 컬럼은 서버가 KST로 해석해 UTC ISO로 직렬화한다(KST 19:00 → 10:00Z).
// date+time 입력으로 분해할 때 UTC 기준(toISOString 등)으로 뽑으면 9시간 밀리고 소모임은
// 날짜가 하루 어긋난다(자정 KST=전날 15:00Z). 반드시 KST 벽시계로 되돌린다.
const KST = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})
function splitKst(iso) {
  // sv-SE 로케일 → "2026-07-25 19:00"
  const [date, time] = KST.format(new Date(iso)).split(' ')
  return { date, time }
}

function meetingToFormValues(m) {
  const start = splitKst(m.startAt)
  const d = defaultFormValues()
  return {
    ...d,
    type: m.type,
    title: m.title,
    category: m.category,
    sido: m.regionSido,
    sigungu: m.regionSigungu,
    eupmyeondong: m.regionEupmyeondong ?? '',
    date: start.date,
    time: start.time,
    endDate: m.endAt ? splitKst(m.endAt).date : d.endDate,
    capacity: m.capacity ?? d.capacity,
    adultOnly: m.adultOnly,
    openChatUrl: m.openChatUrl ?? '',
    description: m.description ?? '',
  }
}

export default function MeetingEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, currentUser } = useAppState()

  const [meeting, setMeeting] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let alive = true
    fetchMeeting(id)
      .then((data) => { if (alive) setMeeting(data) })
      .catch((err) => { if (alive) setLoadError(err.message) })
    return () => { alive = false }
  }, [id])

  if (!isLoggedIn) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 수정" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>수정하려면 먼저 로그인해주세요.</p>
          <PillButton to="/login" variant="accent" block>로그인하러 가기</PillButton>
        </Card>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 수정" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>모임을 불러오지 못했어요. {loadError}</p>
        </Card>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 수정" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>불러오는 중…</p>
        </Card>
      </div>
    )
  }

  const isHost = meeting.host.id === currentUser.id
  const isEnded = isMeetingEnded(meeting)

  if (!isHost || isEnded) {
    return (
      <div className="container--narrow">
        <PageHeader title="모임 수정" />
        <Card variant="solid">
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>
            {!isHost ? '이 모임을 수정할 권한이 없어요.' : '종료되었거나 취소된 모임은 수정할 수 없어요.'}
          </p>
          <PillButton to={`/meetings/${id}`} variant="accent" block>모임으로 돌아가기</PillButton>
        </Card>
      </div>
    )
  }

  const disabled = {
    type: true, // 유형은 변경 불가
    capacity: (meeting.confirmedCount ?? 0) > 0, // 참여자 있으면 정원 잠금(보수적)
    // adultOnly는 FE에서 잠그지 않는다 — 서버가 참여자 나이로 판정한다.
  }

  return (
    <div className="container--narrow">
      <PageHeader title="모임 수정" eyebrow="모임 정보 수정" />
      <MeetingForm
        initialValues={meetingToFormValues(meeting)}
        disabled={disabled}
        submitLabel="수정 저장하기"
        onSubmit={async (payload) => {
          await updateMeeting(id, payload)
          navigate(`/meetings/${id}`)
        }}
      />
    </div>
  )
}
