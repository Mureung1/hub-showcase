import { useEffect, useState } from 'react'
import './App.css'
import AddTaskForm from './components/AddTaskForm'
import Header from './components/Header'
import ProgressCard from './components/ProgressCard'
import TaskList from './components/TaskList'
import { getTasks, updateTaskStatus, archiveTask } from './api/tasks'
import { getMembers } from './api/members'
import { safeGetStoredMemberId, safeSetStoredMemberId } from './utils/storage'

const NEXT_STATUS = { pending: 'in_progress', in_progress: 'done', done: 'pending' }

function App() {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [currentMemberId, setCurrentMemberId] = useState(() => {
    const saved = safeGetStoredMemberId()
    return Number.isNaN(saved) ? null : saved
  })
  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set())

  useEffect(() => {
    getTasks().then(setTasks).catch((err) => console.error(err))

    getMembers()
      .then((data) => {
        setMembers(data)
        // localStorage에 저장된 사람이 지금도 팀원인지 확인하고, 아니면 첫 번째 사람으로 대체
        setCurrentMemberId((prev) => {
          const savedExists = data.some((m) => m.id === prev)
          return savedExists ? prev : (data[0] ? data[0].id : null)
        })
      })
      .catch((err) => console.error(err))
  }, [])

  function handleChangeCurrentMember(memberId) {
    setCurrentMemberId(memberId)
    safeSetStoredMemberId(memberId)
  }

  function handleTaskAdded(newTask) {
    setTasks((prev) => [newTask, ...prev])
  }

  // 태스크 하나에 대한 요청이 진행 중인 동안 그 태스크 id를 pendingTaskIds에 담아
  // 중복 클릭을 막고, 끝나면 다시 빼줌 (성공/실패 모두)
  async function runTaskAction(taskId, action) {
    setPendingTaskIds((prev) => new Set(prev).add(taskId))
    try {
      await action()
    } catch (err) {
      console.error(err)
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  function handleToggleStatus(taskId) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    runTaskAction(taskId, async () => {
      const updated = await updateTaskStatus(
        taskId,
        task.status === 'done' ? 'pending' : 'done',
        currentMemberId
      )
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  function handleCycleStatus(taskId) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    runTaskAction(taskId, async () => {
      const updated = await updateTaskStatus(
        taskId,
        NEXT_STATUS[task.status] || 'pending',
        currentMemberId
      )
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  function handleDeleteTask(taskId) {
    runTaskAction(taskId, async () => {
      await archiveTask(taskId, currentMemberId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    })
  }

  return (
    <div className="page">
      <Header
        members={members}
        currentMemberId={currentMemberId}
        onChangeCurrentMember={handleChangeCurrentMember}
      />
      <ProgressCard tasks={tasks} currentMemberId={currentMemberId} />
      <TaskList
        tasks={tasks}
        members={members}
        currentMemberId={currentMemberId}
        pendingTaskIds={pendingTaskIds}
        onToggleStatus={handleToggleStatus}
        onCycleStatus={handleCycleStatus}
        onDelete={handleDeleteTask}
      />
      <AddTaskForm members={members} onTaskAdded={handleTaskAdded} />
    </div>
  )
}

export default App
