import Bell from 'lucide-react/dist/esm/icons/bell.mjs'
import CheckSquare from 'lucide-react/dist/esm/icons/square-check-big.mjs'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import LogOut from 'lucide-react/dist/esm/icons/log-out.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs'
import UserRound from 'lucide-react/dist/esm/icons/user-round.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { NewProjectModal } from '../../features/projects/components/NewProjectModal.jsx'
import { useAuth } from '../../auth/useAuth.js'
import { selectReceivedInvitations } from '../../state/selectors.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import styles from './AppShell.module.css'

const navItems = [
  { to: '/projects', label: '프로젝트', icon: Layers3 },
  { to: '/tasks', label: '내 할 일', icon: CheckSquare },
  { to: '/members', label: '전체 팀원', icon: Users },
]

export function AppShell() {
  const [showNewProject, setShowNewProject] = useState(false)
  const { capabilities } = useTeamFlow()
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Brand />
        {capabilities.projects ? <div className={styles.createArea}>
          <button className={styles.createButton} type="button" onClick={() => setShowNewProject(true)}><Plus size={15} />새 프로젝트</button>
        </div> : <div className={styles.readOnlyNotice}>읽기 전용 데모</div>}
        <nav className={styles.navigation} aria-label="개요 메뉴">
          <p className={styles.navigationLabel}>개요</p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} end className={({ isActive }) => `${styles.navigationItem} ${isActive ? styles.navigationItemActive : ''}`} to={to}>
              <Icon aria-hidden="true" size={16} strokeWidth={1.8} />{label}
            </NavLink>
          ))}
        </nav>
        <Account label="내 계정" />
      </aside>
      <main className={styles.main}><Outlet /></main>
      {showNewProject ? <NewProjectModal onClose={() => setShowNewProject(false)} /> : null}
    </div>
  )
}

export function Brand() {
  return <header className={styles.brandHeader}><span className={styles.brandMark}>TF</span><span className={styles.brandName}>TeamFlow</span></header>
}

export function Account({ label, compact = false }) {
  const auth = useAuth()
  const { state, actions } = useTeamFlow()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const accountRef = useRef(null)
  const triggerRef = useRef(null)
  const menuId = useId()
  const guest = auth.status === 'guest'
  const name = guest ? '게스트' : auth.user?.displayName || 'TeamFlow 사용자'
  const detail = guest ? '읽기 전용 데모' : auth.user?.email || label
  const initial = Array.from(name).slice(0, 1).join('') || 'T'
  const receivedInvitations = selectReceivedInvitations(state)

  useEffect(() => {
    if (!menuOpen) return undefined

    function closeFromOutside(event) {
      if (!accountRef.current?.contains(event.target)) setMenuOpen(false)
    }

    function closeFromKeyboard(event) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromKeyboard)
    }
  }, [menuOpen])

  async function leave() {
    if (!(await actions.flushPending())) return
    setMenuOpen(false)
    await auth.signOut()
  }

  function openInvitations() {
    setMenuOpen(false)
    navigate('/projects#received-invitations')
  }

  return (
    <footer ref={accountRef} className={`${styles.accountArea} ${compact ? styles.accountAreaCompact : ''}`}>
      <button
        ref={triggerRef}
        className={`${styles.accountTrigger} ${menuOpen ? styles.accountTriggerOpen : ''}`}
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        aria-label={`${name} 계정 메뉴`}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls={menuId}
      >
        <AccountAvatar avatarUrl={auth.user?.avatarUrl} guest={guest} initial={initial} invitationCount={receivedInvitations.length} />
        {compact ? null : <span className={styles.accountCopy}><strong>{name}</strong><span>{detail}</span></span>}
        {compact ? null : <ChevronUp className={`${styles.accountChevron} ${menuOpen ? styles.accountChevronOpen : ''}`} aria-hidden="true" size={14} />}
      </button>
      <button className={styles.accountLogout} type="button" onClick={() => void leave()} aria-label={guest ? '게스트 모드 종료' : '로그아웃'} title={guest ? '게스트 모드 종료' : '로그아웃'}><LogOut size={14} /></button>
      {menuOpen ? (
        <div id={menuId} className={`${styles.accountPopover} ${compact ? styles.accountPopoverCompact : ''}`} role="dialog" aria-label="계정 및 설정">
          <header className={styles.accountPopoverHeader}>
            <AccountAvatar avatarUrl={auth.user?.avatarUrl} guest={guest} initial={initial} large />
            <span className={styles.accountPopoverIdentity}><strong>{name}</strong><span>{detail}</span></span>
          </header>

          <section className={styles.accountPopoverSection} aria-labelledby={`${menuId}-account-heading`}>
            <h2 id={`${menuId}-account-heading`}>계정 정보</h2>
            <div className={styles.accountSettingRow}>
              <UserRound aria-hidden="true" size={16} />
              <span>로그인 방식</span>
              <strong>{guest ? '게스트' : 'Google'}</strong>
            </div>
            <p>{guest ? '계정 없이 데모를 둘러보는 중입니다.' : '이름과 사진은 Google 계정에서 가져옵니다.'}</p>
          </section>

          <section className={styles.accountPopoverSection} aria-labelledby={`${menuId}-settings-heading`}>
            <h2 id={`${menuId}-settings-heading`}>설정</h2>
            {guest ? (
              <div className={styles.accountSettingRow}>
                <ShieldCheck aria-hidden="true" size={16} />
                <span>워크스페이스</span>
                <strong>읽기 전용</strong>
              </div>
            ) : (
              <button className={styles.accountSettingRow} type="button" onClick={openInvitations}>
                <Bell aria-hidden="true" size={16} />
                <span>받은 프로젝트 초대</span>
                <strong>{receivedInvitations.length}건</strong>
              </button>
            )}
          </section>

          <button className={styles.accountPopoverLogout} type="button" onClick={() => void leave()}>
            <LogOut aria-hidden="true" size={16} />
            {guest ? '게스트 모드 종료' : '로그아웃'}
          </button>
        </div>
      ) : null}
    </footer>
  )
}

function AccountAvatar({ avatarUrl, guest, initial, invitationCount = 0, large = false }) {
  return (
    <span className={`${styles.accountAvatarWrap} ${large ? styles.accountAvatarWrapLarge : ''}`}>
      {avatarUrl && !guest
        ? <img className={styles.accountAvatarImage} src={avatarUrl} alt="" referrerPolicy="no-referrer" />
        : <span className={styles.accountAvatar}>{initial}</span>}
      {!large && invitationCount > 0 ? <span className={styles.accountInvitationBadge} aria-hidden="true">{invitationCount > 9 ? '9+' : invitationCount}</span> : null}
    </span>
  )
}
