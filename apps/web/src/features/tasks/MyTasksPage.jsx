import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import { useMemo, useState } from 'react'

import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { formatShortDate } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import workspace from '../../styles/workspace.module.css'
import { TaskDetailModal } from './components/TaskDetailModal.jsx'

export function MyTasksPage() {
  const { state, actions, readOnly } = useTeamFlow()
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const selectedTask = state.tasks.find((task) => task.id === selectedTaskId) ?? null
  const groups = useMemo(() => state.projects.map((project) => ({
    project,
    tasks: state.tasks.filter((task) => task.projectId === project.id && task.assigneeId === state.currentUserId),
  })).filter((group) => group.tasks.length > 0), [state])

  return (
    <section className={workspace.scrollPage} aria-labelledby="my-tasks-title">
      <div className={`${workspace.container} ${workspace.containerNarrow}`}>
        <header className={workspace.pageHeader}><div><p>모든 프로젝트 · 통합 관리</p><h1 id="my-tasks-title">내 할 일</h1></div></header>
        <div className={workspace.stack}>
          {groups.map(({ project, tasks }) => (
            <section className={`${workspace.card} ${workspace.cardCompact}`} key={project.id}>
              <header className={workspace.sectionHeader}><div className={workspace.memberLine}><Layers3 size={16} /><div><h2>{project.name}</h2><span>{tasks.length}개의 배정된 할 일</span></div></div></header>
              <table className={workspace.table}>
                <thead><tr><th>할 일 제목</th><th>마감일</th><th>상태</th></tr></thead>
                <tbody>{tasks.map((task) => (
                  <tr className={workspace.clickableRow} key={task.id} role="button" tabIndex="0" aria-label={`${task.title} 상세 보기`} onClick={() => setSelectedTaskId(task.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTaskId(task.id) } }}>
                    <td><p className={workspace.cellTitle}>{task.title}</p>{task.description ? <p className={workspace.cellDescription}>{task.description}</p> : null}</td>
                    <td className={workspace.mono}>{formatShortDate(task.dueDate)}</td><td><StatusBadge status={task.status} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </section>
          ))}
          {groups.length === 0 ? <p className={workspace.empty}>배정된 내 할 일이 없습니다.</p> : null}
        </div>
      </div>
      {selectedTask ? <TaskDetailModal readOnly={readOnly} task={selectedTask} members={state.members} onClose={() => setSelectedTaskId(null)} onStatusChange={(status) => actions.updateTask(selectedTask.id, { status })} onDelete={async (taskId) => { await actions.deleteTask(taskId); setSelectedTaskId(null) }} /> : null}
    </section>
  )
}
