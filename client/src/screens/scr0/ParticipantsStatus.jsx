import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/identity/Avatar.jsx'
import { Chip } from '../../components/forms/Chip.jsx'
import { Icon } from '../../components/decor/Icon.jsx'
import { InfoCard } from '../../components/cards/InfoCard.jsx'
import { EmptyState } from '../../components/feedback/EmptyState.jsx'
import { NAV_ITEMS } from '../../mocks/mockData.js'
import { getLetterByToken, getResponses } from '../../lib/api.js'
import { countResponded, getSelectedSlotIds, isResponded } from '../../lib/participantStatus.js'
import bgVineWash from '../../assets/bg-vine-wash.jpg'
import laceDoily from '../../assets/vintage-lace-doily.png'
import laceTrimStrip from '../../assets/vintage-lace-trim-strip.png'

// SCR0 · 참가자 현황 화면 — docs/design 「Letter&Co Design System.zip」
// templates/participants-status/ParticipantsStatus.dc.html 이식.
// GET /api/letters/:token, GET /api/letters/:token/responses로 실데이터 연동.
// 초대된 참가자 전원을 표시하며, 미응답자는 강조 없는 '응답 대기' 칩으로 조용히 표시한다.
const ACTIVE_NAV_KEY = 'participants'

export function ParticipantsStatus() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState('loading') // loading | error | ready
  const [errorMsg, setErrorMsg] = useState('')
  const [participants, setParticipants] = useState([])
  const [slotLabelById, setSlotLabelById] = useState({})

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setStatus('error')
      setErrorMsg('모임 링크가 올바르지 않아요')
      return
    }
    Promise.all([getLetterByToken(token), getResponses(token)]).then(([letterResult, responsesResult]) => {
      if (cancelled) return
      if (letterResult.error) {
        setStatus('error')
        setErrorMsg(letterResult.error)
        return
      }
      if (responsesResult.error) {
        setStatus('error')
        setErrorMsg(responsesResult.error)
        return
      }
      const labelById = {}
      for (const slot of letterResult.data.candidate_slots ?? []) {
        labelById[slot.id] = slot.label
      }
      setSlotLabelById(labelById)
      setParticipants(responsesResult.data ?? [])
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const total = participants.length
  const respondedCount = countResponded(participants)
  const pct = total ? Math.round((respondedCount / total) * 100) : 0

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: `var(--paper) url(${bgVineWash}) center top / cover no-repeat`,
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
        position: 'relative',
      }}
    >
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          background: 'var(--paper-cool)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0,
          height: '100vh',
          alignSelf: 'flex-start',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 8px 0', overflow: 'visible', height: '150px', flexShrink: 0 }}>
          <img
            src={laceDoily}
            alt=""
            style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '190px', height: '190px', opacity: 0.95, pointerEvents: 'none', zIndex: 0 }}
          />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span style={{ fontFamily: "'Narony', var(--font-script-ornate)", fontSize: '48px', color: 'var(--wedgwood-deep)' }}>L</span>
            <span style={{ fontFamily: "'Signatie', var(--font-script-signature)", fontSize: '21px', color: 'var(--wedgwood-deep)' }}>etter</span>
            <span style={{ fontFamily: "'Narony', var(--font-script-ornate)", fontSize: '48px', color: 'var(--wedgwood-deep)' }}>&amp;</span>
            <span style={{ fontFamily: "'Narony', var(--font-script-ornate)", fontSize: '48px', color: 'var(--wedgwood-deep)' }}>C</span>
            <span style={{ fontFamily: "'Signatie', var(--font-script-signature)", fontSize: '21px', color: 'var(--wedgwood-deep)' }}>o</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map((item) => {
            const active = item.key === ACTIVE_NAV_KEY
            const itemStyle = {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: 'var(--ink)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              background: active ? '#FFFFFF' : 'transparent',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
            }
            const content = (
              <>
                <Icon name={item.icon} size={20} />
                {item.label}
              </>
            )
            // 참가자 현황만 실제 라우팅 — 나머지 미구현 화면 항목은 동일한 스타일의 비활성 div로,
            // 클릭해도 아무 동작을 하지 않는다(없는 라우트로 이동해 튕기는 것을 방지).
            return active ? (
              <Link key={item.key} to={`${item.href}${token ? `?token=${token}` : ''}`} style={itemStyle}>
                {content}
              </Link>
            ) : (
              <div key={item.key} style={itemStyle}>
                {content}
              </div>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}>
          <Avatar name="정하은" index={0} size={32} />
          {/* TODO: 실제 값으로 교체 (로그인/프로필 화면 완성 후) */}
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)' }}>정하은</div>
        </div>
      </aside>

      <div
        aria-hidden="true"
        style={{
          width: '140px',
          flexShrink: 0,
          background: `url(${laceTrimStrip}) repeat-y center / 140px auto`,
          marginLeft: '-70px',
          marginRight: '-70px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          alignSelf: 'flex-start',
          zIndex: 5,
        }}
      />

      <main style={{ flex: 1, padding: '56px 48px', boxSizing: 'border-box', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ position: 'relative', padding: '8px 0 4px' }}>
          <div style={{ fontFamily: "'Whispering Signature', var(--font-script)", fontWeight: 400, fontSize: '72px', lineHeight: 0.85, color: 'oklch(0.995 0.006 165)' }}>
            Status
          </div>
        </div>

        {status === 'loading' ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-size)', color: 'var(--text-caption)' }}>불러오는 중…</div>
        ) : null}

        {status === 'error' ? (
          <div
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-fold)',
              padding: '24px',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body-size)',
              color: 'var(--ink-soft)',
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        {status === 'ready' && total === 0 ? <EmptyState message="아직 참가자가 없어요, 초대장을 보내볼까요?" /> : null}

        {status === 'ready' && total > 0 ? (
          <>
            <div
              style={{
                background: 'var(--cream)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1, height: '6px', borderRadius: 'var(--radius-pill)', background: 'var(--wedgwood-pale)', overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--wedgwood-deep)',
                    width: `${pct}%`,
                    transition: 'width var(--dur-progress) var(--ease-soft)',
                  }}
                />
              </div>
              {pct === 100 ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--lemon-deep)',
                    border: '1px solid var(--lemon-pale)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-on-deep)" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12.5L10 17.5L19 6.5" />
                  </svg>
                </span>
              ) : null}
              <div style={{ fontFamily: 'var(--font-caption-alt)', fontSize: '11px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                {`${total}명 중 ${respondedCount}명 응답 완료`}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {participants.map((p, i) => {
                const responded = isResponded(p)
                const slotIds = getSelectedSlotIds(p)
                const slotLabels = slotIds.map((id) => slotLabelById[id]).filter(Boolean).join(', ')
                return (
                  <InfoCard key={p.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={p.name} index={i} size={32} />
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>{p.name}</div>
                      </div>
                      {responded ? (
                        <Chip tone={i % 2 === 0 ? 'wedgwood' : 'lemon'}>{slotLabels || '응답 완료'}</Chip>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontFamily: 'var(--font-body)',
                            fontSize: '12px',
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--paper-cool)',
                            color: 'var(--ink-soft)',
                            border: '1px solid var(--line)',
                          }}
                        >
                          응답 대기
                        </span>
                      )}
                    </div>
                  </InfoCard>
                )
              })}
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}
