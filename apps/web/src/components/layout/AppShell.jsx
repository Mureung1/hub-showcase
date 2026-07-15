import CheckSquare from 'lucide-react/dist/esm/icons/square-check-big.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { NewProjectModal } from '../../features/projects/components/NewProjectModal.jsx'
import styles from './AppShell.module.css'

const navItems = [
  { to: '/projects', label: '프로젝트', icon: Layers3 },
  { to: '/tasks', label: '내 할 일', icon: CheckSquare },
  { to: '/members', label: '전체 팀원', icon: Users },
]

export function AppShell() {
  const [showNewProject, setShowNewProject] = useState(false)
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Brand />
        <div className={styles.createArea}>
          <button className={styles.createButton} type="button" onClick={() => setShowNewProject(true)}><Plus size={15} />새 프로젝트</button>
        </div>
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
  return <footer className={styles.accountArea}><span className={styles.accountAvatar}>이</span><span className={styles.accountCopy}><strong>이주환</strong><span>{label}</span></span></footer>
}
