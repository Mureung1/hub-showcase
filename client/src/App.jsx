import { useEffect, useRef, useState } from 'react'
import './App.css'
import AddTaskForm from './components/AddTaskForm'
import ArchivedTasks from './components/ArchivedTasks'
import Header from './components/Header'
import MeetingMatch from './components/MeetingMatch'
import ProgressCard from './components/ProgressCard'
import TaskList from './components/TaskList'
import Toast from './components/Toast'
import {
  getTasks,
  getArchivedTasks,
  updateTaskStatus,
  updateTaskTitle,
  updateTaskAssignee,
  updateTaskDueDate,
  archiveTask,
  restoreTask,
} from './api/tasks'
import { getMembers } from './api/members'
import { safeGetStoredMemberId, safeSetStoredMemberId } from './utils/storage'

const NEXT_STATUS = { pending: 'in_progress', in_progress: 'done', done: 'pending' }

function App() {
  const [currentPage, setCurrentPage] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [archivedTasks, setArchivedTasks] = useState([])
  const [members, setMembers] = useState([])
  const [currentMemberId, setCurrentMemberId] = useState(() => {
    const saved = safeGetStoredMemberId()
    return Number.isNaN(saved) ? null : saved
  })
  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set())
  const [toastMessage, setToastMessage] = useState('')
  const toastTimerRef = useRef(null)

  useEffect(() => {
    getTasks().then(setTasks).catch((err) => console.error(err))
    getArchivedTasks().then(setArchivedTasks).catch((err) => console.error(err))

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

  function showToast(message) {
    setToastMessage(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2500)
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
      const archived = await archiveTask(taskId, currentMemberId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setArchivedTasks((prev) => [archived, ...prev])
    })
  }

  function handleRestoreTask(taskId) {
    runTaskAction(taskId, async () => {
      await restoreTask(taskId, currentMemberId)
      setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId))
      // 복원된 태스크는 created_at이 예전 값이라 맨 앞에 끼워 넣으면 정렬이 어긋날 수 있어
      // 서버가 정렬해서 내려주는 목록을 다시 받아옴
      const refreshed = await getTasks()
      setTasks(refreshed)
    })
  }

  // 인라인 편집(제목/담당자/마감일)은 저장이 끝나야 입력창이 표시로 돌아가므로
  // runTaskAction의 Promise를 그대로 반환해서 호출한 쪽에서 await 할 수 있게 함
  function handleUpdateTitle(taskId, title) {
    return runTaskAction(taskId, async () => {
      const updated = await updateTaskTitle(taskId, title, currentMemberId)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  function handleUpdateAssignee(taskId, assigneeId) {
    return runTaskAction(taskId, async () => {
      const updated = await updateTaskAssignee(taskId, assigneeId, currentMemberId)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  function handleUpdateDueDate(taskId, dueDate) {
    return runTaskAction(taskId, async () => {
      const updated = await updateTaskDueDate(taskId, dueDate, currentMemberId)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  return (
    <>
      <div className="page">
        <Header
          members={members}
          currentMemberId={currentMemberId}
          onChangeCurrentMember={handleChangeCurrentMember}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
        />
        {currentPage === 'tasks' ? (
          <>
            <ProgressCard tasks={tasks} currentMemberId={currentMemberId} />
            <TaskList
              tasks={tasks}
              members={members}
              currentMemberId={currentMemberId}
              pendingTaskIds={pendingTaskIds}
              onToggleStatus={handleToggleStatus}
              onCycleStatus={handleCycleStatus}
              onDelete={handleDeleteTask}
              onUpdateTitle={handleUpdateTitle}
              onUpdateAssignee={handleUpdateAssignee}
              onUpdateDueDate={handleUpdateDueDate}
              showToast={showToast}
            />
            <AddTaskForm members={members} onTaskAdded={handleTaskAdded} />
            <ArchivedTasks
              archivedTasks={archivedTasks}
              members={members}
              currentMemberId={currentMemberId}
              pendingTaskIds={pendingTaskIds}
              onRestore={handleRestoreTask}
              showToast={showToast}
            />
          </>
        ) : (
          <MeetingMatch />
        )}
      </div>
      <Toast message={toastMessage} />
    </>
  )
}

export default App
