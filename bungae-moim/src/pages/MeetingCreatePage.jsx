import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'
import MeetingForm from '../components/MeetingForm.jsx'
import { defaultFormValues } from '../utils/meetingFormDefaults.js'
import { createMeeting } from '../api/meetings.js'

export default function MeetingCreatePage() {
  const { isLoggedIn } = useAppState()
  const navigate = useNavigate()

  if (!isLoggedIn) {
    return (
      <>
        <PageHeader title="모임 등록" />
        <Card variant="dark">
          <p style={{ fontSize: 13.5, color: 'var(--cream-mute)' }}>모임을 등록하려면 먼저 로그인해주세요.</p>
          <PillButton to="/login" variant="accent" block>
            로그인하러 가기
          </PillButton>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="모임 등록" eyebrow="새 모임 만들기" />
      <MeetingForm
        initialValues={defaultFormValues()}
        submitLabel="모임 등록하기"
        onSubmit={async (payload) => {
          await createMeeting(payload)
          navigate('/meetings')
        }}
      />
    </>
  )
}
