import CheckSquare from 'lucide-react/dist/esm/icons/square-check-big.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import LogOut from 'lucide-react/dist/esm/icons/log-out.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { NewProjectModal } from '../../features/projects/components/NewProjectModal.jsx'
import { useAuth } from '../../auth/useAuth.js'
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

export function Account({ label }) {
  const auth = useAuth()
  const guest = auth.status === 'guest'
  const name = guest ? '게스트' : auth.user?.displayName || 'TeamFlow 사용자'
  const detail = guest ? '읽기 전용 데모' : auth.user?.email || label
  const initial = Array.from(name).slice(0, 1).join('') || 'T'

  return (
    <footer className={styles.accountArea}>
      {auth.user?.avatarUrl && !guest
        ? <img className={styles.accountAvatarImage} src={auth.user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        : <span className={styles.accountAvatar}>{initial}</span>}
      <span className={styles.accountCopy}><strong>{name}</strong><span>{detail}</span></span>
      <button className={styles.accountLogout} type="button" onClick={auth.signOut} aria-label={guest ? '게스트 모드 종료' : '로그아웃'} title={guest ? '게스트 모드 종료' : '로그아웃'}><LogOut size={14} /></button>
    </footer>
  )
}
