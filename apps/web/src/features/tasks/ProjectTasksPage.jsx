import { TASK_STATUS } from '@teamflow/shared'
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down.mjs'
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up.mjs'
import Search from 'lucide-react/dist/esm/icons/search.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { Avatar } from '../../components/ui/Avatar.jsx'
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER } from '../../constants/labels.js'
import { formatShortDate } from '../../lib/format.js'
import { useTeamFlow } from '../../state/useTeamFlow.js'
import { selectProjectMembers, selectProjectTasks } from '../../state/selectors.js'
import workspace from '../../styles/workspace.module.css'
import styles from './ProjectTasksPage.module.css'

const filters = ['all', ...TASK_STATUS_ORDER]
const statColors = {
  all: ['#3d4a63', '#f0f2f7'],
  [TASK_STATUS.NOT_STARTED]: ['#38383f', '#f3f3f5'],
  [TASK_STATUS.IN_PROGRESS]: ['#2a4ca0', '#eef3ff'],
  [TASK_STATUS.IN_REVIEW]: ['#6b3e00', '#fff8ec'],
  [TASK_STATUS.COMPLETED]: ['#175538', '#edf8f2'],
}

export function ProjectTasksPage() {
  const { project, openTaskCreate, openTaskDetail } = useOutletContext()
  const { state, actions, capabilities } = useTeamFlow()
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(null)
  const tasks = useMemo(() => selectProjectTasks(state, project.id), [state, project.id])
  const members = useMemo(() => selectProjectMembers(state, project.id), [state, project.id])
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return tasks.filter((task) => filter === 'all' || task.status === filter).filter((task) => {
      const member = memberById.get(task.assigneeId)
      return !normalized || [task.title, task.description ?? '', member?.name ?? ''].some((value) => value.toLocaleLowerCase('ko-KR').includes(normalized))
    })
  }, [tasks, filter, query, memberById])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const statusRank = new Map(TASK_STATUS_ORDER.map((status, index) => [status, index]))
    const valueFor = (task) => {
      if (sort.key === 'title') return task.title
      if (sort.key === 'assignee') return memberById.get(task.assigneeId)?.name ?? ''
      if (sort.key === 'dueDate') return task.dueDate
      return statusRank.get(task.status) ?? TASK_STATUS_ORDER.length
    }
    return filtered.map((task, index) => ({ task, index })).sort((left, right) => {
      const leftValue = valueFor(left.task)
      const rightValue = valueFor(right.task)
      const comparison = typeof leftValue === 'number'
        ? leftValue - rightValue
        : leftValue.localeCompare(rightValue, 'ko-KR')
      return (sort.direction === 'asc' ? comparison : -comparison) || left.index - right.index
    }).map(({ task }) => task)
  }, [filtered, sort, memberById])

  function changeSort(key) {
    setSort((current) => current?.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' })
  }

  const count = (status) => status === 'all' ? tasks.length : tasks.filter((task) => task.status === status).length

  return (
    <section className={workspace.scrollPage} aria-labelledby="tasks-title">
      <div className={workspace.container}>
        <header className={workspace.pageHeader}><div><p>{project.name} · 할 일</p><h1 id="tasks-title">할 일 관리</h1></div>{capabilities.tasks ? <button className={workspace.primaryButton} type="button" onClick={openTaskCreate}><Plus size={15} />새 할 일</button> : null}</header>
        <div className={styles.stats}>{filters.map((status) => { const [color, background] = statColors[status]; const active = filter === status; return <button key={status} type="button" aria-pressed={active} className={active ? styles.statActive : ''} style={{ '--stat-color': color, '--stat-background': background }} onClick={() => setFilter(status)}><span>{status === 'all' ? '전체' : TASK_STATUS_LABEL[status]}</span><strong className={workspace.mono}>{count(status)}</strong></button> })}</div>
        <div className={styles.toolbar}>
          <div className={styles.viewSwitch}><button type="button" aria-pressed={view === 'list'} className={view === 'list' ? styles.activeView : ''} onClick={() => setView('list')}>목록</button><button type="button" aria-pressed={view === 'board'} className={view === 'board' ? styles.activeView : ''} onClick={() => setView('board')}>보드</button></div>
          <div className={styles.toolbarRight}>{filter !== 'all' ? <button className={styles.activeFilter} type="button" onClick={() => setFilter('all')}>{TASK_STATUS_LABEL[filter]} <X size={12} /></button> : null}<label className={workspace.searchField}><Search size={14} /><span className="visually-hidden">할 일 검색</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="할 일 검색" /></label></div>
        </div>

        {view === 'list' ? (
          <section className={workspace.card}>
            <table className={workspace.table}><thead><tr><SortHeader label="할 일 제목" sortKey="title" sort={sort} onSort={changeSort} /><SortHeader label="담당자" sortKey="assignee" sort={sort} onSort={changeSort} /><SortHeader label="마감일" sortKey="dueDate" sort={sort} onSort={changeSort} /><SortHeader label="진행 상태" sortKey="status" sort={sort} onSort={changeSort} /></tr></thead><tbody>{sorted.map((task) => { const member = memberById.get(task.assigneeId); return <tr className={`${workspace.clickableRow} ${task.isNew ? styles.newTask : ''}`} key={task.id} role="button" tabIndex="0" aria-label={`${task.title} 상세 보기`} onClick={() => openTaskDetail(task)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTaskDetail(task) } }}><td><div className={styles.titleWithNew}><p className={workspace.cellTitle}>{task.title}</p>{task.isNew ? <span>NEW</span> : null}</div>{task.description ? <p className={workspace.cellDescription}>{task.description}</p> : null}</td><td>{member ? <span className={workspace.memberLine}><Avatar member={member} />{member.name}</span> : '미지정'}</td><td className={workspace.mono}>{formatShortDate(task.dueDate)}</td><td><select disabled={!capabilities.tasks} className={styles.statusSelect} aria-label={`${task.title} 진행 상태`} value={task.status} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onChange={(event) => actions.updateTask(task.id, { status: event.target.value })}>{TASK_STATUS_ORDER.map((status) => <option key={status} value={status}>{TASK_STATUS_LABEL[status]}</option>)}</select></td></tr> })}{sorted.length === 0 ? <tr><td colSpan="4"><p className={workspace.empty}>검색 결과가 없습니다.</p></td></tr> : null}</tbody></table>
          </section>
        ) : (
          <div className={styles.board}>{TASK_STATUS_ORDER.map((status) => { const group = filtered.filter((task) => task.status === status); const [color, background] = statColors[status]; return <section className={styles.boardColumn} key={status}><header style={{ '--column-color': color, '--column-background': background }}><span><i />{TASK_STATUS_LABEL[status]}</span><strong>{group.length}</strong></header><div>{group.map((task) => { const member = memberById.get(task.assigneeId); return <button className={task.isNew ? styles.newBoardTask : ''} type="button" key={task.id} onClick={() => openTaskDetail(task)}><strong>{task.title}</strong>{task.description ? <p>{task.description}</p> : null}<span>{member ? <Avatar member={member} /> : <i />}<em className={workspace.mono}>{formatShortDate(task.dueDate)}</em></span></button> })}{group.length === 0 ? <p className={styles.noTasks}>할 일 없음</p> : null}</div></section> })}</div>
        )}
      </div>
    </section>
  )
}

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort?.key === sortKey
  const direction = active ? sort.direction : null
  return (
    <th aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className={styles.sortHeader} type="button" onClick={() => onSort(sortKey)}>
        {label}
        {direction === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : null}
        {direction === 'desc' ? <ArrowDown size={13} aria-hidden="true" /> : null}
        <span className="visually-hidden">{active ? `${direction === 'asc' ? '오름차순' : '내림차순'} 정렬됨` : '정렬'}</span>
      </button>
    </th>
  )
}
