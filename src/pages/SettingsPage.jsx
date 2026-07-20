import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSession } from '../lib/useSession.js'
import Icon from '../components/Icon.jsx'
import './SettingsPage.css'

// 혼동 문자(I/O/0/1) 제외 — docs/discord-linking.md §7.3 코드 스펙.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const CODE_TTL_MS = 10 * 60 * 1000

function generateCode() {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
}

function formatRemaining(ms) {
  if (ms <= 0) return null
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Discord 계정 연동 설정 화면. 웹에서 연동 코드를 발급하면 사용자가 Discord에서
 * `/연동 코드:XXXXXX`를 입력해 자기 계정·알림 채널을 연결한다.
 * 근거: docs/discord-linking.md §5
 */
function SettingsPage() {
  const { session } = useSession()
  const userId = session?.user?.id ?? null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [link, setLink] = useState(null)
  const [pendingCode, setPendingCode] = useState(null)
  const [issuing, setIssuing] = useState(false)
  const [checking, setChecking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [copyState, setCopyState] = useState('idle')
  const [now, setNow] = useState(() => Date.now())

  const loadLink = useCallback(async () => {
    if (!supabase || !userId) return
    const { data, error: fetchError } = await supabase
      .from('discord_links')
      .select('discord_user_id, notify_channel_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('[SettingsPage] discord_links 조회 실패:', fetchError)
      setError('연동 상태를 불러오지 못했습니다.')
      return
    }
    setLink(data)
  }, [userId])

  const loadPendingCode = useCallback(async () => {
    if (!supabase || !userId) return
    const { data, error: fetchError } = await supabase
      .from('discord_link_codes')
      .select('code, expires_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('[SettingsPage] discord_link_codes 조회 실패:', fetchError)
      return
    }
    if (data && new Date(data.expires_at).getTime() > Date.now()) {
      setPendingCode({ code: data.code, expiresAt: data.expires_at })
    } else {
      setPendingCode(null)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!supabase) {
        setError('Supabase 환경변수가 설정되지 않아 연동 기능을 사용할 수 없습니다.')
        setLoading(false)
        return
      }
      if (!userId) return

      setLoading(true)
      setError('')
      await Promise.all([loadLink(), loadPendingCode()])
      if (!cancelled) setLoading(false)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [userId, loadLink, loadPendingCode])

  useEffect(() => {
    if (!pendingCode) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pendingCode])

  const remainingMs = pendingCode ? new Date(pendingCode.expiresAt).getTime() - now : 0

  useEffect(() => {
    if (pendingCode && remainingMs <= 0) {
      setPendingCode(null)
    }
  }, [pendingCode, remainingMs])

  async function handleIssueCode() {
    if (!supabase || !userId) return
    setIssuing(true)
    setError('')

    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()

    const { error: upsertError } = await supabase
      .from('discord_link_codes')
      .upsert({ user_id: userId, code, expires_at: expiresAt }, { onConflict: 'user_id' })

    setIssuing(false)

    if (upsertError) {
      console.error('[SettingsPage] 연동 코드 발급 실패:', upsertError)
      setError('코드를 발급하지 못했습니다. 다시 시도해주세요.')
      return
    }
    setPendingCode({ code, expiresAt })
    setCopyState('idle')
  }

  async function handleCopy() {
    if (!pendingCode) return
    try {
      await navigator.clipboard.writeText(pendingCode.code)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch (copyError) {
      console.error('[SettingsPage] 클립보드 복사 실패:', copyError)
    }
  }

  async function handleCheckLink() {
    setChecking(true)
    setError('')
    await Promise.all([loadLink(), loadPendingCode()])
    setChecking(false)
  }

  async function handleUnlink() {
    if (!supabase || !userId) return
    if (!window.confirm('Discord 연동을 해제할까요? 이후 알림이 도착하지 않습니다.')) return

    setUnlinking(true)
    const { error: deleteError } = await supabase.from('discord_links').delete().eq('user_id', userId)
    setUnlinking(false)

    if (deleteError) {
      console.error('[SettingsPage] 연동 해제 실패:', deleteError)
      setError('연동을 해제하지 못했습니다.')
      return
    }
    setLink(null)
  }

  const remainingLabel = formatRemaining(remainingMs)

  return (
    <section className="settings-page">
      <h1>설정</h1>

      {loading && <p className="settings-status">불러오는 중...</p>}
      {!loading && error && <p className="settings-status settings-status--error">{error}</p>}

      {!loading && !error && (
        <div className="card settings-card">
          <div className="settings-card__head">
            <span className="settings-card__title">
              <Icon name="discord" size={20} />
              Discord 연동
            </span>
            <span className={link ? 'status active' : 'status pending'}>
              {link ? '연동됨' : '미연동'}
            </span>
          </div>

          {link ? (
            <div className="settings-linked">
              <p className="settings-linked__desc">
                알림 채널: <code>{link.notify_channel_id ?? '-'}</code>
              </p>
              <button type="button" className="btn" onClick={handleUnlink} disabled={unlinking}>
                {unlinking ? '해제 중...' : '연동 해제'}
              </button>
            </div>
          ) : (
            <div className="settings-unlinked">
              {!pendingCode && (
                <>
                  <p className="settings-unlinked__desc">
                    Discord에서 감시 알림을 받으려면 계정을 연동하세요.
                  </p>
                  <button
                    type="button"
                    className="btn accent"
                    onClick={handleIssueCode}
                    disabled={issuing}
                  >
                    {issuing ? '발급 중...' : 'Discord 연동하기'}
                  </button>
                </>
              )}

              {pendingCode && (
                <div className="settings-code">
                  <div className="settings-code__value">
                    <code className="settings-code__code">{pendingCode.code}</code>
                    <button type="button" className="btn" onClick={handleCopy}>
                      {copyState === 'copied' ? '복사됨' : '복사'}
                    </button>
                  </div>
                  <p className="settings-code__hint">
                    Discord 채널에서 <code>{`/연동 코드:${pendingCode.code}`}</code> 입력
                    {remainingLabel && ` · ${remainingLabel} 후 만료`}
                  </p>
                  <div className="settings-code__actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={handleCheckLink}
                      disabled={checking}
                    >
                      {checking ? '확인 중...' : '연동 확인'}
                    </button>
                    <button type="button" className="btn" onClick={handleIssueCode} disabled={issuing}>
                      코드 재발급
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default SettingsPage
