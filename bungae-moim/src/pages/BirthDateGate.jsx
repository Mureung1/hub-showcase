import { useState } from 'react'
import { useAppState } from '../context/AppStateContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import PillButton from '../components/PillButton.jsx'

// 로그인 후 생년월일이 없는 사용자에게 최초 1회 입력을 받는 화면(기획서 6.1).
// 서버가 성인 여부의 진실의 원천이므로, 여기서는 형식만 갖춰 보내고 판정은 서버에 맡긴다.
export default function BirthDateGate() {
  const { saveBirthDate } = useAppState()
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await saveBirthDate(birthDate)
      // 성공하면 컨텍스트의 user가 갱신되어 App이 이 게이트를 더 이상 렌더하지 않는다.
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title="생년월일을 알려주세요" eyebrow="최초 1회 입력" />
      <Card variant="solid">
        <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>
          성인 전용 모임 참여 여부를 확인하는 데 쓰여요. 한 번 입력하면 수정할 수 없어요.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 14 }}
          />
          {error && <p style={{ fontSize: 13, color: 'var(--danger, #c0392b)' }}>{error}</p>}
          <PillButton variant="accent" block type="submit" disabled={submitting}>
            {submitting ? '저장 중…' : '저장하고 시작하기'}
          </PillButton>
        </form>
      </Card>
    </>
  )
}
