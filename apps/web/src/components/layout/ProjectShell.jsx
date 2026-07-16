import Bot from 'lucide-react/dist/esm/icons/bot.mjs'
import CheckSquare from 'lucide-react/dist/esm/icons/square-check-big.mjs'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left.mjs'
import FileText from 'lucide-react/dist/esm/icons/file-text.mjs'
import Folder from 'lucide-react/dist/esm/icons/folder.mjs'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import { useState } from 'react'
import { Navigate, NavLink, Outlet, useParams } from 'react-router-dom'

import { Account } from './AppShell.jsx'
import { TaskCreateModal } from '../../features/tasks/components/TaskCreateModal.jsx'
import { TaskDetailModal } from '../../features/tasks/components/TaskDetailModal.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProject, selectProjectMembers } from '../../state/selectors.js'
import styles from './AppShell.module.css'

const projectNav = [
  { suffix: '', label: '대시보드', icon: LayoutDashboard, end: true },
  { suffix: 'tasks', label: '할 일', icon: CheckSquare },
  { suffix: 'notes', label: '공유 노트', icon: FileText },
  { suffix: 'resources', label: '자료실', icon: Folder },
  { suffix: 'members', label: '팀원', icon: Users },
  { suffix: 'ai', label: 'AI 팀원', icon: Bot },
]

export function ProjectShell() {
  const { projectId } = useParams()
  const { state, actions } = useTeamFlow()
  const [collapsed, setCollapsed] = useState(false)
  const [showTaskCreate, setShowTaskCreate] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const project = selectProject(state, projectId)
  const selectedTask = state.tasks.find((task) => task.id === selectedTaskId) ?? null

  if (!project) return <Navigate replace to="/projects" />

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
      <aside className={`${styles.sidebar} ${styles.projectSidebar}`}>
        <header className={styles.projectHeader}>
          {collapsed ? (
            <NavLink className={styles.collapsedProjectIcon} to="/projects" aria-label="내 프로젝트로 돌아가기"><Layers3 size={15} /></NavLink>
          ) : (
            <>
              <NavLink className={styles.backLink} to="/projects"><ChevronLeft size={13} />내 프로젝트</NavLink>
              <div className={styles.projectIdentity}><span><Layers3 size={15} /></span><strong>{project.name}</strong></div>
            </>
          )}
        </header>
        <nav id={`project-navigation-${project.id}`} className={styles.projectNavigation} aria-label="프로젝트 메뉴">
          {projectNav.map(({ suffix, label, icon: Icon, end }) => {
            const to = `/projects/${project.id}${suffix ? `/${suffix}` : ''}`
            return (
              <NavLink key={label} end={end} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={({ isActive }) => `${styles.navigationItem} ${styles.projectNavigationItem} ${collapsed ? styles.navigationItemCollapsed : ''} ${isActive ? styles.navigationItemActive : ''}`} to={to}>
                <Icon aria-hidden="true" size={16} />{collapsed ? null : label}
              </NavLink>
            )
          })}
        </nav>
        <div className={styles.projectFooter}>
          <button className={styles.collapseButton} type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'} aria-expanded={!collapsed} aria-controls={`project-navigation-${project.id}`}><ChevronLeft size={15} className={collapsed ? styles.chevronFlipped : ''} /></button>
          {collapsed ? <span className={styles.accountAvatar}>이</span> : <Account label="프로젝트 생성자" />}
        </div>
      </aside>
      <main className={styles.main}><Outlet context={{ project, openTaskCreate: () => setShowTaskCreate(true), openTaskDetail: (task) => setSelectedTaskId(task.id) }} /></main>
      {showTaskCreate ? <TaskCreateModal projectId={project.id} members={selectProjectMembers(state, project.id)} onClose={() => setShowTaskCreate(false)} /> : null}
      {selectedTask ? <TaskDetailModal task={selectedTask} members={state.members} onClose={() => setSelectedTaskId(null)} onStatusChange={(status) => actions.updateTask(selectedTask.id, { status })} onDelete={async (taskId) => { await actions.deleteTask(taskId); setSelectedTaskId(null) }} /> : null}
    </div>
  )
}
