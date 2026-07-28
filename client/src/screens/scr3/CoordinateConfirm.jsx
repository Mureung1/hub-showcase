import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/identity/Avatar.jsx'
import { Icon } from '../../components/decor/Icon.jsx'
import { InfoCard } from '../../components/cards/InfoCard.jsx'
import { Button } from '../../components/forms/Button.jsx'
import { NAV_ITEMS } from '../../mocks/mockData.js'
import { getLetterByToken, getRoles, getSuggestions, confirmLetter } from '../../lib/api.js'
import bgVineWash from '../../assets/bg-vine-wash.jpg'
import laceDoily from '../../assets/vintage-lace-doily.png'
import laceTrimStrip from '../../assets/vintage-lace-trim-strip.png'
import laceFrameRect from '../../assets/lace-frame-rect.png'

// SCR3 · 확정 화면 — docs/design 「Letter&Co Design System.zip」
// templates/coordinate-confirm/CoordinateConfirm.dc.html 이식.
// 화면 진입 시 자동으로 추천을 부르지 않는다(자동확정 UI 금지) — "추천받기"를 눌러야 POST /suggest 호출.
// 추천은 시간·장소 후보 선택값을 채워줄 뿐이고, 최종 저장은 "확정하기" 클릭으로 PATCH /confirm 호출.
const ACTIVE_NAV_KEY = 'coordinate'

export function CoordinateConfirm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [loadStatus, setLoadStatus] = useState('loading') // loading | error | ready
  const [errorMsg, setErrorMsg] = useState('')
  const [letter, setLetter] = useState(null)
  const [roles, setRoles] = useState([])
  const [confirmed, setConfirmed] = useState(false)

  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [selectedLocationId, setSelectedLocationId] = useState(null)

  const [suggestStatus, setSuggestStatus] = useState('idle') // idle | loading | done | fallback | error
  const [suggestion, setSuggestion] = useState(null)
  const [suggestNote, setSuggestNote] = useState('')

  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | error
  const [saveErrorMsg, setSaveErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setLoadStatus('error')
      setErrorMsg('모임 링크가 올바르지 않아요')
      return
    }
    Promise.all([getLetterByToken(token), getRoles(token)]).then(([letterResult, rolesResult]) => {
      if (cancelled) return
      if (letterResult.error) {
        setLoadStatus('error')
        setErrorMsg(letterResult.error)
        return
      }
      setLetter(letterResult.data)
      setRoles(rolesResult.data ?? [])
      setConfirmed(Boolean(letterResult.data.confirmed_at))
      setSelectedSlotId(letterResult.data.confirmed_slot_id ?? null)
      setSelectedLocationId(letterResult.data.confirmed_location_id ?? null)
      setLoadStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [token])

  async function runSuggest() {
    setSuggestStatus('loading')
    setSuggestNote('')
    const result = await getSuggestions(token)
    if (result.error) {
      setSuggestStatus('error')
      setSuggestNote(result.error)
      return
    }
    const data = result.data
    if (data?.fallback) {
      setSuggestStatus('fallback')
      setSuggestNote(data.reason || '추천을 만들 수 없어요')
      return
    }
    setSuggestion(data)
    setSuggestStatus('done')
    if (data.suggested_slot_id && (letter.candidate_slots ?? []).some((s) => s.id === data.suggested_slot_id)) {
      setSelectedSlotId(data.suggested_slot_id)
    }
    if (data.suggested_location_id && (letter.candidate_locations ?? []).some((l) => l.id === data.suggested_location_id)) {
      setSelectedLocationId(data.suggested_location_id)
    }
  }

  async function confirm() {
    if (!selectedSlotId || !selectedLocationId || saveStatus === 'saving') return
    setSaveStatus('saving')
    setSaveErrorMsg('')
    const result = await confirmLetter(token, {
      confirmed_slot_id: selectedSlotId,
      confirmed_location_id: selectedLocationId,
    })
    if (result.error) {
      setSaveStatus('error')
      setSaveErrorMsg(result.error)
      return
    }
    setLetter(result.data)
    setSaveStatus('idle')
    setConfirmed(true)
  }

  const slots = letter?.candidate_slots ?? []
  const locations = letter?.candidate_locations ?? []
  const selectedSlot = slots.find((s) => s.id === selectedSlotId)
  const selectedLocation = locations.find((l) => l.id === selectedLocationId)
  const roleSummary = roles.length ? `${roles.length}명 배정 완료` : '역할 미정'
  const canConfirm = Boolean(selectedSlotId && selectedLocationId)

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
      <style>{`
        @keyframes lco-bloom-petal { 0% { transform: translate(-50%,-100%) rotate(var(--rot)) scale(0); opacity: 0; } 60% { transform: translate(-50%,-100%) rotate(var(--rot)) scale(1.15); opacity: 1; } 100% { transform: translate(-50%,-100%) rotate(var(--rot)) scale(1); opacity: 1; } }
        .lco-bloom-petal { position:absolute; top:50%; left:50%; width:13px; height:21px; border-radius:60% 60% 6% 6%; background:color-mix(in srgb, var(--wedgwood) 85%, white); box-shadow:0 1px 3px rgba(74,68,56,0.18); transform-origin:50% 100%; animation: lco-bloom-petal 0.6s ease both; }
        @keyframes lco-pop { from { opacity:0; transform:scale(0.3);} to { opacity:1; transform:scale(1);} }
      `}</style>

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
              background: active ? 'var(--surface-raised)' : 'transparent',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
            }
            const content = (
              <>
                <Icon name={item.icon} size={20} />
                {item.label}
              </>
            )
            // 참가자 현황·조율·진행만 실제 라우팅 — 나머지 미구현 화면 항목은 동일한 스타일의 비활성 div로 둔다.
            const href =
              item.key === 'participants'
                ? `${item.href}${token ? `?token=${token}` : ''}`
                : item.key === 'coordinate'
                  ? `/scr2/roles${token ? `?token=${token}` : ''}`
                  : item.key === 'progress'
                    ? `/scr4/workspace${token ? `?token=${token}` : ''}`
                    : null
            return href ? (
              <Link key={item.key} to={href} style={itemStyle}>
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
          pointerEvents: 'none',
        }}
      />

      <main style={{ flex: 1, padding: '56px 48px', boxSizing: 'border-box', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <div style={{ position: 'relative', padding: '8px 0 4px', width: '100%', maxWidth: '560px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Whispering Signature', var(--font-script)", fontWeight: 400, fontSize: '72px', lineHeight: 0.85, color: 'oklch(0.995 0.006 165)' }}>
            Confirm
          </div>
        </div>

        {loadStatus === 'loading' ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-size)', color: 'var(--text-caption)' }}>불러오는 중…</div>
        ) : null}

        {loadStatus === 'error' ? (
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

        {loadStatus === 'ready' ? (
          <>
            {/* 레이스 프레임 안의 편지 카드 — 이 화면의 단일 장식 요소 */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '900px', aspectRatio: '675/1200', containerType: 'inline-size' }}>
              <img
                src={laceFrameRect}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', zIndex: 0, filter: 'drop-shadow(0 6px 16px rgba(74,68,56,0.14))' }}
              />
              <div style={{ position: 'absolute', inset: '29% 21% 26%', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
                <LetterRow label="모임" value={letter.title} />
                <LetterRow label="시간" value={selectedSlot?.label ?? '아직 선택되지 않았어요'} />
                <LetterRow label="장소" value={selectedLocation?.name ?? '아직 선택되지 않았어요'} />
                <LetterRow label="역할" value={roleSummary} />
              </div>
            </div>

            {!confirmed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', maxWidth: '560px' }}>
                {suggestStatus === 'idle' || suggestStatus === 'loading' || suggestStatus === 'error' ? (
                  <Button variant="primary" onClick={runSuggest} disabled={suggestStatus === 'loading'}>
                    {suggestStatus === 'loading' ? '추천을 준비하고 있어요…' : '추천받기'}
                  </Button>
                ) : null}

                {suggestStatus === 'error' ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)' }}>{suggestNote}</div>
                ) : null}

                {suggestStatus === 'fallback' ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)', textAlign: 'center' }}>
                    {suggestNote} — 아래에서 직접 골라주세요
                  </div>
                ) : null}

                <CandidatePicker
                  label="시간"
                  items={slots.map((s) => ({ id: s.id, label: s.label }))}
                  selectedId={selectedSlotId}
                  onSelect={setSelectedSlotId}
                  reason={suggestStatus === 'done' ? suggestion?.suggested_slot_reason : ''}
                  emptyMessage="후보 시간이 없어요"
                />

                <CandidatePicker
                  label="장소"
                  items={locations.map((l) => ({ id: l.id, label: l.name }))}
                  selectedId={selectedLocationId}
                  onSelect={setSelectedLocationId}
                  reason={suggestStatus === 'done' ? suggestion?.suggested_location_reason : ''}
                  emptyMessage="후보 장소가 없어요"
                />

                {suggestStatus === 'done' && suggestion?.role_suggestions?.length ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontFamily: 'var(--font-caption-alt)', fontSize: '11px', letterSpacing: '0.15em', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>역할 추천</div>
                    {/* 역할 배정 수락/변경 UI는 SCR2(CoordinateRoles) 몫 — 여기서는 추천 내용만 참고용으로 보여준다. */}
                    {suggestion.role_suggestions.map((role, i) => (
                      <InfoCard key={`${role.name}-${i}`}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>{role.name}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px' }}>{role.reason}</div>
                      </InfoCard>
                    ))}
                  </div>
                ) : null}

                <Button variant="primary" block disabled={!canConfirm || saveStatus === 'saving'} onClick={confirm}>
                  {saveStatus === 'saving' ? '확정하는 중…' : '확정하기'}
                </Button>

                {saveStatus === 'error' ? (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)' }}>{saveErrorMsg}</div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                  <div className="lco-bloom-petal" style={{ '--rot': '0deg' }} />
                  <div className="lco-bloom-petal" style={{ '--rot': '72deg', animationDelay: '0.05s' }} />
                  <div className="lco-bloom-petal" style={{ '--rot': '144deg', animationDelay: '0.1s' }} />
                  <div className="lco-bloom-petal" style={{ '--rot': '216deg', animationDelay: '0.15s' }} />
                  <div className="lco-bloom-petal" style={{ '--rot': '288deg', animationDelay: '0.2s' }} />
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '12px',
                      height: '12px',
                      margin: '-6px 0 0 -6px',
                      borderRadius: '50%',
                      background: 'color-mix(in srgb, var(--lemon) 90%, white)',
                      boxShadow: '0 1px 3px rgba(74,68,56,0.18)',
                      animation: 'lco-pop 0.3s ease 0.4s both',
                    }}
                  />
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-soft)' }}>모두에게 확정 소식을 전했어요</div>
                <Button variant="accent" onClick={() => navigate(`/scr4/workspace${token ? `?token=${token}` : ''}`)}>
                  진행 화면으로
                </Button>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}

function LetterRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2.4cqw', padding: '1.8cqw 0', borderBottom: '1px dashed var(--line)' }}>
      <span style={{ width: '7.4cqw', flexShrink: 0, fontFamily: 'var(--font-caption-alt)', fontSize: 'clamp(11px, 2.1cqw, 15px)', color: 'var(--ink-soft)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(14px, 2.8cqw, 20px)', color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}

function CandidatePicker({ label, items, selectedId, onSelect, reason, emptyMessage }) {
  if (!items.length) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontFamily: 'var(--font-caption-alt)', fontSize: '11px', letterSpacing: '0.15em', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)' }}>{emptyMessage}</div>
      </div>
    )
  }
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontFamily: 'var(--font-caption-alt)', fontSize: '11px', letterSpacing: '0.15em', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>{label}</div>
      {items.map((item) => (
        <InfoCard key={item.id} selected={item.id === selectedId} onClick={() => onSelect(item.id)}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink)' }}>{item.label}</div>
        </InfoCard>
      ))}
      {reason && selectedId ? (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-soft)' }}>{reason}</div>
      ) : null}
    </div>
  )
}
