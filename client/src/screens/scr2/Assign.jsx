import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/identity/Avatar.jsx'
import { Icon } from '../../components/decor/Icon.jsx'
import { InfoCard } from '../../components/cards/InfoCard.jsx'
import { Chip } from '../../components/forms/Chip.jsx'
import { Button } from '../../components/forms/Button.jsx'
import { Input } from '../../components/forms/Input.jsx'
import { EmptyState } from '../../components/feedback/EmptyState.jsx'
import { NAV_ITEMS } from '../../mocks/mockData.js'
import { getLetterByToken, getResponses, getRoles, createRole, updateRole, getSuggestions, createRoleTasks } from '../../lib/api.js'
import bgVineWash from '../../assets/bg-vine-wash.jpg'
import laceDoily from '../../assets/vintage-lace-doily.png'
import laceTrimStrip from '../../assets/vintage-lace-trim-strip.png'

// SCR2 · 역할 배정 화면 — docs/design 「Letter&Co Design System.zip」
// templates/coordinate-roles/CoordinateRoles.dc.html 이식.
// AI 역할 추천(role_suggestions)은 저장되지 않는 휘발성 데이터라, "AI 역할 추천 받기"를
// 눌러야 POST /suggest를 호출하고(자동 확정 UI 금지 — CoordinateConfirm.jsx와 동일 원칙) 그
// 결과를 실제 roles 행으로 생성한다. 이미 역할이 있으면 추천 버튼 없이 바로 목록을 보여준다.
const ACTIVE_NAV_KEY = 'coordinate'

export function Assign() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [loadStatus, setLoadStatus] = useState('loading') // loading | error | ready
  const [errorMsg, setErrorMsg] = useState('')
  const [letter, setLetter] = useState(null)
  const [participants, setParticipants] = useState([])
  const [roles, setRoles] = useState([])

  const [suggestStatus, setSuggestStatus] = useState('idle') // idle | loading | fallback | error
  const [suggestNote, setSuggestNote] = useState('')

  const [manualRoleName, setManualRoleName] = useState('')
  const [manualRoleStatus, setManualRoleStatus] = useState('idle') // idle | saving | error
  const [manualRoleErrorMsg, setManualRoleErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setLoadStatus('error')
      setErrorMsg('모임 링크가 올바르지 않아요')
      return
    }
    Promise.all([getLetterByToken(token), getResponses(token), getRoles(token)]).then(([letterResult, responsesResult, rolesResult]) => {
      if (cancelled) return
      if (letterResult.error) {
        setLoadStatus('error')
        setErrorMsg(letterResult.error)
        return
      }
      if (responsesResult.error) {
        setLoadStatus('error')
        setErrorMsg(responsesResult.error)
        return
      }
      if (rolesResult.error) {
        setLoadStatus('error')
        setErrorMsg(rolesResult.error)
        return
      }
      setLetter(letterResult.data)
      setParticipants(responsesResult.data ?? [])
      setRoles(rolesResult.data ?? [])
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
    const suggestions = data?.role_suggestions ?? []
    if (!suggestions.length) {
      setSuggestStatus('fallback')
      setSuggestNote('추천할 역할이 없어요')
      return
    }
    const created = await Promise.all(
      suggestions.map((s, i) =>
        createRole(token, {
          name: s.name,
          reason: s.reason,
          source: 'ai',
          position: i,
          assignee_id: s.assignee_participant_id ?? null,
        })
      )
    )
    const failed = created.find((r) => r.error)
    if (failed) {
      setSuggestStatus('error')
      setSuggestNote(failed.error)
      return
    }
    const createdRoles = created.map((r) => r.data)

    // 역할별 AI 제안 업무(tasks)도 함께 생성 — 실패해도 역할 배정 자체는 이미 끝났으니 화면은 진행시킨다.
    await Promise.all(
      createdRoles.map((role, i) => {
        const tasks = suggestions[i]?.tasks
        return tasks?.length ? createRoleTasks(token, role.id, tasks) : Promise.resolve(null)
      })
    )
    const withTasks = await getRoles(token)
    setRoles(withTasks.error ? createdRoles : withTasks.data ?? createdRoles)
    setSuggestStatus('idle')
  }

  function reassign(roleId, participantId) {
    setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, assignee_id: participantId } : r)))
    updateRole(token, roleId, { assignee_id: participantId }).then((result) => {
      if (result.error) {
        // 저장 실패 — 서버 재조회로 되돌린다.
        getRoles(token).then((r) => {
          if (!r.error) setRoles(r.data ?? [])
        })
      }
    })
  }

  // AI 역할 추천이 실패하거나(fallback/error) 참여자가 직접 역할을 추가하고 싶을 때의 수동 입력 경로.
  // AI 생성 역할과 동일하게 roles 테이블에 저장되므로(source만 'manual') 이후 화면들이 구분 없이 읽는다.
  async function addManualRole() {
    const name = manualRoleName.trim()
    if (!name || manualRoleStatus === 'saving') return
    setManualRoleStatus('saving')
    setManualRoleErrorMsg('')
    const result = await createRole(token, { name, source: 'manual', position: roles.length })
    if (result.error) {
      setManualRoleStatus('error')
      setManualRoleErrorMsg(result.error)
      return
    }
    setRoles((prev) => [...prev, result.data])
    setManualRoleName('')
    setManualRoleStatus('idle')
  }

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
            // 참가자 현황·조율·진행만 실제 라우팅 — 나머지 미구현 화면 항목은 동일한 스타일의 비활성 div.
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
          <Avatar name={letter?.host_name || ''} index={0} size={32} />
          {/* TODO: 실제 값으로 교체 (로그인/프로필 화면 완성 후) */}
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink)' }}>{letter?.host_name || '호스트'}</div>
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
            Assign
          </div>
          {letter ? (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-size)', color: 'var(--text-caption)', marginTop: '24px' }}>{letter.title}</div>
          ) : null}
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
          <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {participants.length === 0 ? (
              <EmptyState message="아직 응답한 참여자가 없어요, 참여자 응답을 기다려볼까요?" />
            ) : roles.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-size)', color: 'var(--text-caption)', textAlign: 'center' }}>
                  아직 배정된 역할이 없어요
                </div>
                <Button variant="primary" onClick={runSuggest} disabled={suggestStatus === 'loading'}>
                  {suggestStatus === 'loading' ? '추천을 준비하고 있어요…' : 'AI 역할 추천 받기'}
                </Button>
                {suggestStatus === 'error' || suggestStatus === 'fallback' ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)', textAlign: 'center' }}>{suggestNote} — 직접 추가해볼까요?</div>
                    <ManualRoleForm
                      value={manualRoleName}
                      onChange={setManualRoleName}
                      onSubmit={addManualRole}
                      status={manualRoleStatus}
                      errorMsg={manualRoleErrorMsg}
                    />
                  </>
                ) : null}
              </div>
            ) : (
              <>
                {roles.map((role) => (
                  <InfoCard key={role.id} title={role.name}>
                    {role.reason ? (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '10px' }}>{role.reason}</div>
                    ) : null}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption-size)', color: 'var(--text-caption)', marginBottom: '6px' }}>담당자</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {participants.map((p) => (
                        <Chip key={p.id} tone="wedgwood" selected={role.assignee_id === p.id} onClick={() => reassign(role.id, p.id)}>
                          {p.name}
                        </Chip>
                      ))}
                    </div>
                  </InfoCard>
                ))}

                <ManualRoleForm
                  value={manualRoleName}
                  onChange={setManualRoleName}
                  onSubmit={addManualRole}
                  status={manualRoleStatus}
                  errorMsg={manualRoleErrorMsg}
                />

                <Button variant="primary" block soundType="finish" onClick={() => navigate(`/scr3/confirm${token ? `?token=${token}` : ''}`)}>
                  확정하러 가기
                </Button>
              </>
            )}
          </div>
        ) : null}
      </main>

      <div style={{ position: 'fixed', right: '14px', bottom: '14px', fontFamily: "'Signatie', var(--font-script)", fontSize: '13px', color: 'var(--wedgwood-deep)', opacity: 0.5, pointerEvents: 'none', zIndex: 50 }}>
        l
      </div>
    </div>
  )
}

// 역할 이름 직접 추가 폼 — AI 추천이 실패했을 때의 폴백이자, 역할이 이미 있을 때도 상시 노출되는 추가 입력구.
function ManualRoleForm({ value, onChange, onSubmit, status, errorMsg }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <Input
            variant="underline"
            placeholder="역할 이름을 직접 입력하세요"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <Button size="sm" variant="accent" disabled={!value.trim() || status === 'saving'} onClick={onSubmit}>
          {status === 'saving' ? '추가하는 중…' : '역할 추가'}
        </Button>
      </div>
      {status === 'error' ? (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--ink-soft)' }}>{errorMsg}</div>
      ) : null}
    </div>
  )
}
