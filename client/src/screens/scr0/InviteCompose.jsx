import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionTitle } from '../../components/identity/SectionTitle.jsx'
import { Input } from '../../components/forms/Input.jsx'
import { Chip } from '../../components/forms/Chip.jsx'
import { Button } from '../../components/forms/Button.jsx'
import { Toast } from '../../components/feedback/Toast.jsx'
import { createLetter } from '../../lib/api.js'
import { GROUP } from '../../mocks/mockData.js'
import letterPaper from '../../assets/letter-paper.png'
import waxSeal from '../../assets/vintage-wax-seal-swan.png'
import laceTrim from '../../assets/vintage-lace-trim-strip.png'
import envelope from '../../assets/envelope.png'

// SCR0 · 1 초대장 작성 화면 — docs/design 「Letter&Co Design System.zip」
// templates/invite-compose/InviteCompose.dc.html 이식.
// 편지지 실사 텍스처 + 왁스씰 + 레이스 트림, 발송 시 접힘·봉투삽입·발송 애니메이션(디자인 타이밍 그대로 유지).
//
// [필수값 임시 기본값] POST /api/letters는 host_name·candidate_slots를 필수로 요구하지만
// 이 화면에는 해당 입력란이 없다(디자인 원본 기준). 실제 후보 시간대 수집은 SCR1에서 이뤄지므로
// 여기서는 임시 기본값으로 채워 전송한다.
const TEMP_HOST_NAME = '나'
const TEMP_CANDIDATE_SLOTS = [{ id: 's1', label: '시간 미정' }]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function InviteCompose() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [members] = useState(() => GROUP.members.slice(0, 3))
  const [phase, setPhase] = useState('writing') // writing | sending | sent
  const [errorMsg, setErrorMsg] = useState('')
  const sendDisabled = title.trim().length === 0

  async function send() {
    if (sendDisabled) return
    setErrorMsg('')
    setPhase('sending')

    const [result] = await Promise.all([
      createLetter({
        title,
        host_name: TEMP_HOST_NAME,
        topic: note,
        candidate_slots: TEMP_CANDIDATE_SLOTS,
        candidate_locations: [],
        participant_names: members,
      }),
      wait(900),
    ])

    if (result.error) {
      setPhase('writing')
      setErrorMsg(result.error)
      return
    }

    setPhase('sent')
    setTimeout(() => {
      navigate(`/scr0/share?token=${result.data.link_token}`)
    }, 1200)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 65% 50% at 82% 0%, rgba(140,163,194,0.20), transparent 62%), radial-gradient(ellipse 60% 50% at 10% 100%, rgba(242,215,116,0.10), transparent 65%), var(--paper-cool)',
      }}
    >
      <style>{`
        @keyframes lco-fold { 0% { transform: scaleY(1); opacity:1; } 100% { transform: scaleY(0.14) translateY(70px); opacity:1; } }
        .lco-letter-folding { animation: lco-fold 0.32s var(--ease-soft, ease) forwards; }
        @keyframes lco-insert { 0% { transform: scaleY(0.14) translateY(70px); opacity:1; } 100% { transform: scaleY(0.08) translateY(6px); opacity:0.1; } }
        .lco-letter-inserting { animation: lco-insert 0.3s var(--ease-soft, ease) 0.32s forwards; opacity:1; }
        @keyframes lco-env-send { 0% { transform: translateY(0) scale(1); opacity:1; } 55% { transform: translateY(-22px) scale(1.03); opacity:1; } 100% { transform: translateY(-96px) scale(0.68); opacity:0; } }
        .lco-envelope-sending { animation: lco-env-send 0.42s cubic-bezier(.3,.9,.4,1) 0.6s forwards; }
        @keyframes lco-seal-in { from { opacity:0; transform:rotate(-6deg) scale(0.4);} to { opacity:1; transform:rotate(-6deg) scale(1);} }
        .lco-seal-pop { animation: lco-seal-in 0.4s var(--ease-soft, ease) 0.95s both; }
        @keyframes lco-fade-up { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }
        .lco-sent-msg { animation: lco-fade-up 0.35s ease 1.1s both; }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'var(--texture-grain)', opacity: 0.5, mixBlendMode: 'overlay', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ '--text-script-lg': '48px', '--text-h2': '26px' }}>
          <SectionTitle script="Invite" title="초대장을 써볼까요" subtitle="SCR·1 초대장 작성" align="left" />
        </div>

        {phase === 'writing' ? (
          <>
            <div
              style={{
                position: 'relative',
                borderRadius: '10px',
                boxShadow: '0 6px 20px rgba(74,68,56,0.09)',
                overflow: 'hidden',
                backgroundColor: 'var(--cream)',
                backgroundImage: `url(${letterPaper})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div style={{ position: 'relative', padding: '34px 30px 44px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px solid rgba(74,68,56,0.1)', pointerEvents: 'none' }} />
                <img src={waxSeal} alt="" style={{ position: 'absolute', top: '12px', right: '16px', width: '48px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(74,68,56,0.25))' }} />

                <Input variant="underline" label="모임 이름" placeholder="예: 한강 피크닉 모임" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input variant="underline" label="함께 전할 한마디" placeholder="예: 오랜만에 다 같이 모여요" value={note} onChange={(e) => setNote(e.target.value)} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.18em', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>함께할 사람</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {members.map((m) => (
                      <Chip key={m} tone="wedgwood" sticker>
                        {m}
                      </Chip>
                    ))}
                    <Chip tone="lemon" sticker>+ 추가</Chip>
                  </div>
                </div>
              </div>
              <img src={laceTrim} alt="" style={{ display: 'block', width: '100%', height: '24px', objectFit: 'cover', objectPosition: 'top', opacity: 0.92 }} />
            </div>

            <Button variant="primary" block disabled={sendDisabled} onClick={send}>
              ✉ 보내기
            </Button>

            {errorMsg ? <Toast icon="leaf">{errorMsg}</Toast> : null}
          </>
        ) : null}

        {phase === 'sending' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0 12px', gap: '16px' }}>
            <div style={{ position: 'relative', width: '220px', height: '190px' }}>
              <div
                className="lco-letter-folding lco-letter-inserting"
                style={{
                  position: 'absolute',
                  left: '10px',
                  right: '10px',
                  top: 0,
                  height: '120px',
                  backgroundColor: 'var(--cream)',
                  backgroundImage: `url(${letterPaper})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  boxShadow: '0 4px 10px rgba(74,68,56,0.15)',
                  transformOrigin: 'top center',
                  zIndex: 3,
                }}
              />
              <img className="lco-envelope-sending" src={envelope} alt="" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '220px', filter: 'drop-shadow(0 8px 16px rgba(74,68,56,0.2))' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)' }}>편지를 접어 보내는 중…</div>
          </div>
        ) : null}

        {phase === 'sent' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 0' }}>
            <img className="lco-seal-pop" src={waxSeal} alt="" style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'drop-shadow(0 3px 8px rgba(74,68,56,0.3))' }} />
            <div className="lco-sent-msg" style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-soft)' }}>초대장을 보냈어요</div>
          </div>
        ) : null}
      </div>

      <div style={{ position: 'fixed', right: '14px', bottom: '14px', fontFamily: "'Signatie', var(--font-script)", fontSize: '13px', color: 'var(--wedgwood-deep)', opacity: 0.5, pointerEvents: 'none', zIndex: 50 }}>
        l
      </div>
    </div>
  )
}
