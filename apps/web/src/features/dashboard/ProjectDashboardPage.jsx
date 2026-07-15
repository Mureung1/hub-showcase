import { TASK_STATUS, calculateProgress } from '@teamflow/shared'
import Calendar from 'lucide-react/dist/esm/icons/calendar-days.mjs'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.mjs'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import { ResourceIcon } from '../../components/ui/ResourceIcon.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { formatPeriod, formatShortDate } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProjectMembers, selectProjectTasks } from '../../state/selectors.js'
import workspace from '../../styles/workspace.module.css'
import styles from './ProjectDashboardPage.module.css'

const priority = { [TASK_STATUS.IN_PROGRESS]: 0, [TASK_STATUS.IN_REVIEW]: 1, [TASK_STATUS.NOT_STARTED]: 2, [TASK_STATUS.COMPLETED]: 3 }

export function ProjectDashboardPage() {
  const { project, openTaskCreate, openTaskDetail } = useOutletContext()
  const { state } = useTeamFlow()
  const navigate = useNavigate()
  const [expandedTasks, setExpandedTasks] = useState(false)
  const [panels, setPanels] = useState({ team: true, notes: true, resources: true })
  const tasks = selectProjectTasks(state, project.id)
  const members = selectProjectMembers(state, project.id)
  const notes = state.notes.filter((note) => note.projectId === project.id)
  const resources = state.resources.filter((resource) => resource.projectId === project.id)
  const orderedTasks = useMemo(() => [...tasks].sort((a, b) => priority[a.status] - priority[b.status]), [tasks])
  const completed = tasks.filter((task) => task.status === TASK_STATUS.COMPLETED).length
  const progress = calculateProgress(tasks)
  const counts = {
    inProgress: tasks.filter((task) => task.status === TASK_STATUS.IN_PROGRESS).length,
    review: tasks.filter((task) => task.status === TASK_STATUS.IN_REVIEW).length,
    waiting: tasks.filter((task) => task.status === TASK_STATUS.NOT_STARTED).length,
  }
  const latestNote = notes[0]
  const memberById = new Map(state.members.map((member) => [member.id, member]))
  const toggle = (key) => setPanels((current) => ({ ...current, [key]: !current[key] }))

  return (
    <section className={workspace.scrollPage} aria-labelledby="dashboard-title">
      <div className={workspace.container}>
        <header className={workspace.pageHeader}>
          <div><p>내 프로젝트</p><h1 id="dashboard-title">{project.name}</h1><span className={styles.period}><Calendar size={12} /><span className={workspace.mono}>{formatPeriod(project.startDate, project.endDate)}</span></span></div>
          <button className={workspace.primaryButton} type="button" onClick={openTaskCreate}><Plus size={15} />새 할 일</button>
        </header>

        <section className={`${workspace.card} ${styles.progressStrip}`}>
          <div className={styles.progressMain}><strong className={workspace.mono}>{progress}%</strong><div className={styles.track} role="progressbar" aria-label={`${project.name} 진행률`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div><span className={workspace.mono}>완료 {completed}/{tasks.length}</span><i /><span>남은 {tasks.length - completed}개</span><i /><span>진행 {counts.inProgress} · 검토 {counts.review} · 대기 {counts.waiting}</span><button type="button" aria-expanded={expandedTasks} onClick={() => setExpandedTasks((value) => !value)}>{expandedTasks ? '접기' : '펼치기'}<ChevronDown size={14} className={expandedTasks ? styles.rotated : ''} /></button></div>
          {expandedTasks ? <div className={styles.expandedTaskGrid}>{orderedTasks.map((task) => <button type="button" key={task.id} onClick={() => openTaskDetail(task)}><span>{task.title}</span><span className={workspace.mono}>{formatShortDate(task.dueDate)}</span><StatusBadge status={task.status} /></button>)}</div> : null}
        </section>

        <div className={styles.dashboardGrid}>
          <section className={`${workspace.card} ${styles.tasksCard}`}>
            <header className={workspace.sectionHeader}><h2>우선 할 일</h2><button type="button" onClick={() => navigate(`/projects/${project.id}/tasks`)}>전체 보기 <ChevronRight size={13} /></button></header>
            <table className={workspace.table}>
              <thead><tr><th>할 일</th><th>담당자</th><th>마감</th><th>상태</th></tr></thead>
              <tbody>{orderedTasks.map((task) => { const member = memberById.get(task.assigneeId); return <tr className={workspace.clickableRow} key={task.id} role="button" tabIndex="0" aria-label={`${task.title} 상세 보기`} onClick={() => openTaskDetail(task)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTaskDetail(task) } }}><td><p className={workspace.cellTitle}>{task.title}</p></td><td>{member ? <span className={workspace.memberLine}><Avatar member={member} />{member.name}</span> : '미지정'}</td><td className={workspace.mono}>{formatShortDate(task.dueDate)}</td><td><StatusBadge status={task.status} /></td></tr> })}</tbody>
            </table>
          </section>

          <aside className={styles.sidePanels}>
            <DashboardPanel title="팀원" meta={`${members.length}명`} open={panels.team} onToggle={() => toggle('team')}>
              <div className={styles.memberList}>{members.map((member) => <div key={member.id}><Avatar member={member} /><span><strong>{member.name}</strong><small>{member.role}</small></span>{member.isAi ? <em>AI</em> : null}</div>)}</div><button className={styles.panelLink} type="button" onClick={() => navigate(`/projects/${project.id}/members`)}>전체 보기</button>
            </DashboardPanel>
            {latestNote ? <DashboardPanel title="공유 노트" meta={formatShortDate(latestNote.updatedAt)} open={panels.notes} onToggle={() => toggle('notes')}><button className={styles.notePreview} type="button" onClick={() => navigate(`/projects/${project.id}/notes`)}><strong>{latestNote.title}</strong><span>{latestNote.content.replace(/[#*`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim()}</span></button></DashboardPanel> : null}
            <DashboardPanel title="자료" meta={`${resources.length}개`} open={panels.resources} onToggle={() => toggle('resources')}><div className={styles.resourceList}>{resources.slice(0, 3).map((resource) => <div key={resource.id}><ResourceIcon type={resource.type} /><span><strong>{resource.name}</strong><small className={workspace.mono}>{formatShortDate(resource.updatedAt)}</small></span></div>)}</div><button className={styles.panelLink} type="button" onClick={() => navigate(`/projects/${project.id}/resources`)}>전체 보기</button></DashboardPanel>
          </aside>
        </div>
      </div>
    </section>
  )
}

function DashboardPanel({ title, meta, open, onToggle, children }) {
  return <section className={`${workspace.card} ${styles.panel}`}><button className={styles.panelHeader} type="button" aria-expanded={open} onClick={onToggle}><strong>{title}</strong><span>{meta}<ChevronDown size={14} className={open ? styles.rotated : ''} /></span></button>{open ? <div className={styles.panelBody}>{children}</div> : null}</section>
}
