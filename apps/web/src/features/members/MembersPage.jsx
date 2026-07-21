import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProject } from '../../state/selectors.js'
import workspace from '../../styles/workspace.module.css'
import { AddMemberModal } from './AddMemberModal.jsx'
import styles from './MembersPage.module.css'

export function MembersPage() {
  const { projectId } = useParams()
  const { state, capabilities } = useTeamFlow()
  const [showAdd, setShowAdd] = useState(false)
  const project = projectId ? selectProject(state, projectId) : null
  const members = project ? state.members.filter((member) => project.memberIds.includes(member.id)) : state.members
  const projectTasks = project ? state.tasks.filter((task) => task.projectId === project.id) : state.tasks

  const projectByMember = useMemo(() => new Map(state.members.map((member) => [member.id, state.projects.filter((candidate) => candidate.memberIds.includes(member.id))])), [state.members, state.projects])

  return (
    <section className={workspace.scrollPage} aria-labelledby="members-title">
      <div className={`${workspace.container} ${workspace.containerNarrow}`}>
        <header className={workspace.pageHeader}>
          <div><p>{project ? `${project.name} · 팀원` : '모든 프로젝트 · 통합 관리'}</p><h1 id="members-title">{project ? '팀원 관리' : '전체 팀원'}</h1></div>
          {project && capabilities.members ? <button className={workspace.primaryButton} type="button" onClick={() => setShowAdd(true)}><Plus size={15} />팀원 추가</button> : null}
        </header>
        <div className={styles.grid}>
          {members.map((member) => {
            const tasks = projectTasks.filter((task) => task.assigneeId === member.id)
            const projects = projectByMember.get(member.id) ?? []
            return (
              <article className={`${styles.memberCard} ${member.isAi ? styles.aiCard : ''}`} key={member.id}>
                <div className={styles.memberHeader}><Avatar member={member} size="large" /><div><div className={styles.nameLine}><h2>{member.name}</h2>{member.isAi ? <span>AI</span> : null}</div><p>{member.role}</p></div></div>
                <p className={styles.description}>{member.description || '소개가 없습니다.'}</p>
                {!project && projects.length > 0 ? <div className={styles.chips}>{projects.map((item) => <span key={item.id}>{item.name}</span>)}</div> : null}
                <div className={styles.taskSummary}><div><span>담당 할 일</span><strong>{tasks.length}개</strong></div>{tasks.slice(0, 2).map((task) => <div className={styles.taskLine} key={task.id}><span>{task.title}</span><StatusBadge status={task.status} /></div>)}</div>
              </article>
            )
          })}
        </div>
      </div>
      {showAdd && project && capabilities.members ? <AddMemberModal projectId={project.id} onClose={() => setShowAdd(false)} /> : null}
    </section>
  )
}
