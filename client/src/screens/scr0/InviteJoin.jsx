import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionTitle } from '../../components/identity/SectionTitle.jsx'
import { Input } from '../../components/forms/Input.jsx'
import { InfoCard } from '../../components/cards/InfoCard.jsx'
import { Checkbox } from '../../components/forms/Checkbox.jsx'
import { Chip } from '../../components/forms/Chip.jsx'
import { Button } from '../../components/forms/Button.jsx'
import { Toast } from '../../components/feedback/Toast.jsx'
import { getLetterByToken, createResponse } from '../../lib/api.js'
import laceTrim from '../../assets/vintage-lace-trim-strip.png'
import waxSeal from '../../assets/vintage-wax-seal-swan.png'

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

const submissionKey = (token) => `letterco:invite-join:${token}`

function readSubmission(token) {
  if (!token) return null
  try {
    const raw = localStorage.getItem(submissionKey(token))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// SCR0 · 1-2 참가 정보 입력 화면 — docs/design 「Letter&Co Design System.zip」
// templates/invite-join/InviteJoin.dc.html 이식. 디자인은 mock TIME_SLOTS를 쓰지만
// 여기서는 GET /api/letters/:token으로 받은 실제 candidate_slots를 사용한다.
// 제출 후 SCR1(CoordinateSchedule)이 아직 없어 화면 내 완료 상태로 마무리한다.
// 제출 완료 여부는 localStorage에 token별로 기록해, 새로고침해도 완료 상태가 유지되게 한다.
export function InviteJoin() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const initialSubmission = readSubmission(token)

  const [status, setStatus] = useState('loading') // loading | error | ready
  const [loadErrorMsg, setLoadErrorMsg] = useState('')
  const [letter, setLetter] = useState(null)
  const [name, setName] = useState(initialSubmission?.name ?? '')
  const [slots, setSlots] = useState([])
  const [locations, setLocations] = useState([])
  const [mbti, setMbti] = useState('')
  const [phase, setPhase] = useState(initialSubmission ? 'done' : 'form') // form | sending | done
  const [submitErrorMsg, setSubmitErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setStatus('error')
      setLoadErrorMsg('초대 링크가 올바르지 않아요')
      return
    }
    if (readSubmission(token)) {
      // 이미 제출한 참가자 — 완료 상태만 보여주면 되므로 모임 조회를 건너뛴다.
      setStatus('ready')
      return
    }
    getLetterByToken(token).then((result) => {
      if (cancelled) return
      if (result.error) {
        setStatus('error')
        setLoadErrorMsg(result.error)
        return
      }
      setLetter(result.data)
      setSlots((result.data.candidate_slots ?? []).map((s) => ({ ...s, selected: false })))
      setLocations((result.data.candidate_locations ?? []).map((l) => ({ ...l, selected: false })))
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [token])

  function toggleSlot(id) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)))
  }

  function toggleLocation(id) {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l)))
  }

  const submitDisabled =
    name.trim().length === 0 ||
    !slots.some((s) => s.selected) ||
    !locations.some((l) => l.selected) ||
    mbti === '' ||
    phase === 'sending'

  async function submit() {
    if (submitDisabled) return
    setSubmitErrorMsg('')
    setPhase('sending')
    const result = await createResponse(token, {
      participant_name: name,
      selected_slot_ids: slots.filter((s) => s.selected).map((s) => s.id),
      selected_location_ids: locations.filter((l) => l.selected).map((l) => l.id),
      personality_type: mbti,
    })
    if (result.error) {
      setPhase('form')
      setSubmitErrorMsg(result.error)
      return
    }
    try {
      localStorage.setItem(submissionKey(token), JSON.stringify({ name }))
    } catch {
      // localStorage 접근 불가 환경(프라이빗 모드 등) — 새로고침 유지만 못 할 뿐 제출 자체는 이미 성공했으므로 무시.
    }
    setPhase('done')
  }

  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'var(--paper)' }}>
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {status === 'loading' && phase !== 'done' ? (
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-size)', color: 'var(--text-caption)' }}>불러오는 중…</div>
        ) : null}

        {status === 'error' && phase !== 'done' ? (
          <div
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-fold)',
              padding: '24px',
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body-size)',
              color: 'var(--ink-soft)',
            }}
          >
            {loadErrorMsg}
          </div>
        ) : null}

        {status === 'ready' && phase !== 'done' ? (
          <>
            <SectionTitle script="Join" title={`${letter.title}에 초대됐어요`} subtitle="SCR·1-2 참가 정보 입력" align="left" />

            <div
              style={{
                position: 'relative',
                background: 'var(--surface-raised)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '20px',
                boxSizing: 'border-box',
                boxShadow: 'var(--shadow-fold)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px solid rgba(74,68,56,0.08)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', right: '-14px', bottom: '-14px', width: '64px', height: '64px', borderRadius: '50%', background: 'var(--ink)', opacity: 0.04, pointerEvents: 'none' }} />

              <Input variant="underline" label="이름" placeholder="이름을 입력하세요" value={name} onChange={(e) => setName(e.target.value)} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption-size)', color: 'var(--text-caption)' }}>가능한 시간대 (복수 선택)</div>
                {slots.map((slot) => (
                  <InfoCard key={slot.id} selected={slot.selected} onClick={() => toggleSlot(slot.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>{slot.label}</span>
                      <Checkbox checked={slot.selected} onChange={() => toggleSlot(slot.id)} />
                    </div>
                  </InfoCard>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption-size)', color: 'var(--text-caption)' }}>가능한 장소 (복수 선택)</div>
                {locations.map((location) => (
                  <InfoCard key={location.id} selected={location.selected} onClick={() => toggleLocation(location.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>{location.name}</span>
                      <Checkbox checked={location.selected} onChange={() => toggleLocation(location.id)} />
                    </div>
                  </InfoCard>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption-size)', color: 'var(--text-caption)' }}>성향 (MBTI)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {MBTI_TYPES.map((type) => (
                    <Chip key={type} tone="wedgwood" selected={mbti === type} onClick={() => setMbti(type)}>
                      {type}
                    </Chip>
                  ))}
                </div>
              </div>

              <img src={laceTrim} alt="" style={{ display: 'block', width: 'calc(100% + 40px)', margin: '4px -20px -20px', height: '22px', objectFit: 'cover', objectPosition: 'top', opacity: 0.9 }} />
            </div>

            <Button variant="primary" block disabled={submitDisabled} onClick={submit}>
              {phase === 'sending' ? '보내는 중…' : '참가 정보 보내기'}
            </Button>

            {submitErrorMsg ? <Toast icon="leaf">{submitErrorMsg}</Toast> : null}
          </>
        ) : null}

        {phase === 'done' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 0' }}>
            <img src={waxSeal} alt="" style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'drop-shadow(0 3px 8px rgba(74,68,56,0.3))' }} />
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'var(--text-h2)', color: 'var(--ink)' }}>참가 정보를 보냈어요</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)' }}>{name}님의 응답이 저장됐어요</div>
          </div>
        ) : null}
      </div>

      <div style={{ position: 'fixed', right: '14px', bottom: '14px', fontFamily: "'Signatie', var(--font-script)", fontSize: '13px', color: 'var(--wedgwood-deep)', opacity: 0.5, pointerEvents: 'none', zIndex: 50 }}>
        l
      </div>
    </div>
  )
}
