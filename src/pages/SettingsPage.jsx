import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSession } from '../lib/useSession.js'
import Icon from '../components/Icon.jsx'
import DiscordLinkPanel from '../components/DiscordLinkPanel.jsx'
import './SettingsPage.css'

const SECTIONS = [
  { key: 'profile', label: '프로필', icon: 'user' },
  { key: 'discord', label: '알림 연동', icon: 'discord' },
]

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

/** 프로필 / 계정 정보 섹션 — 이메일(auth) + 가입일(profiles.created_at). */
function ProfileSection() {
  const { session } = useSession()
  const userId = session?.user?.id ?? null
  const email = session?.user?.email ?? '-'
  const [joinedAt, setJoinedAt] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase || !userId) return
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        console.error('[SettingsPage] profiles 조회 실패:', error)
        return
      }
      setJoinedAt(data?.created_at ?? null)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <div className="settings-profile">
      <dl className="settings-fields">
        <div className="settings-field">
          <dt>이메일</dt>
          <dd>{email}</dd>
        </div>
        <div className="settings-field">
          <dt>가입일</dt>
          <dd>{formatDate(joinedAt)}</dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * 설정 화면 — 좌측 사이드바 + 콘텐츠. 섹션 전환은 로컬 state.
 * 프로필(계정 정보) / 알림 연동(Discord).
 */
function SettingsPage() {
  const [active, setActive] = useState('profile')

  const current = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0]

  return (
    <section className="settings-page">
      <h1>설정</h1>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="설정 메뉴">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              className={
                section.key === active
                  ? 'settings-nav__item settings-nav__item--active'
                  : 'settings-nav__item'
              }
              onClick={() => setActive(section.key)}
              aria-current={section.key === active ? 'page' : undefined}
            >
              <Icon name={section.icon} size={16} />
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="card settings-content">
          {current.key === 'profile' && <ProfileSection />}
          {current.key === 'discord' && <DiscordLinkPanel />}
        </div>
      </div>
    </section>
  )
}

export default SettingsPage
