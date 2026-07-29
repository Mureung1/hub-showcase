import { useEffect, useRef, useState } from 'react'
import './App.css'
import ActivityLog from './components/ActivityLog'
import AddTaskForm from './components/AddTaskForm'
import ArchivedTasks from './components/ArchivedTasks'
import Header from './components/Header'
import MeetingMatch from './components/MeetingMatch'
import ProgressCard from './components/ProgressCard'
import TaskList from './components/TaskList'
import TeamJoin from './components/TeamJoin'
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
import { getActivityLogs } from './api/activityLogs'
import {
  safeGetStoredMemberId,
  safeSetStoredMemberId,
  safeGetStoredTeamId,
  safeSetStoredTeamId,
} from './utils/storage'

const NEXT_STATUS = { pending: 'in_progress', in_progress: 'done', done: 'pending' }

function App() {
  const [currentPage, setCurrentPage] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [archivedTasks, setArchivedTasks] = useState([])
  const [logs, setLogs] = useState([])
  const [members, setMembers] = useState([])
  const [currentTeamId, setCurrentTeamId] = useState(null)
  const [isCheckingTeam, setIsCheckingTeam] = useState(true)
  const [currentMemberId, setCurrentMemberId] = useState(() => {
    const saved = safeGetStoredMemberId()
    return Number.isNaN(saved) ? null : saved
  })
  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set())
  const [toastMessage, setToastMessage] = useState('')
  const toastTimerRef = useRef(null)

  // 새로고침 시 저장된 team_id가 실제 존재하는 팀인지 검증.
  // getCurrentTeam은 검증용이 아니므로, 그 팀 멤버가 있는지로 대신 확인한다
  // (멤버가 하나도 없으면 존재하지 않는 팀으로 간주). 실패/미보유 시 null 유지 → 초대코드 화면.
  useEffect(() => {
    const savedTeamId = safeGetStoredTeamId()
    if (Number.isNaN(savedTeamId)) {
      setIsCheckingTeam(false)
      return
    }

    getMembers(savedTeamId)
      .then((data) => {
        if (data.length > 0) {
          setCurrentTeamId(savedTeamId)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsCheckingTeam(false))
  }, [])

  // currentTeamId가 확정된 뒤에만 태스크/멤버/활동로그를 불러온다
  // (팀이 정해지기 전에는 멤버 목록도 없으므로 currentMemberId 검증도 자연히 미뤄짐)
  useEffect(() => {
    if (currentTeamId === null) return

    getTasks(currentTeamId).then(setTasks).catch((err) => console.error(err))
    getArchivedTasks(currentTeamId).then(setArchivedTasks).catch((err) => console.error(err))
    getActivityLogs(currentTeamId).then(setLogs).catch((err) => console.error(err))

    getMembers(currentTeamId)
      .then((data) => {
        setMembers(data)
        // localStorage에 저장된 사람이 지금도 팀원인지 확인하고, 아니면 첫 번째 사람으로 대체
        setCurrentMemberId((prev) => {
          const savedExists = data.some((m) => m.id === prev)
          return savedExists ? prev : (data[0] ? data[0].id : null)
        })
      })
      .catch((err) => console.error(err))
  }, [currentTeamId])

  function handleTeamJoined(teamId, memberId) {
    safeSetStoredTeamId(teamId)
    safeSetStoredMemberId(memberId)
    setCurrentTeamId(teamId)
    setCurrentMemberId(memberId)
  }

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
        currentTeamId,
        taskId,
        task.status === 'done' ? 'pending' : 'done',
        currentMemberId
      )
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      // 상태 변경은 서버에서 활동 로그를 자동으로 남기므로 같이 새로고침
      getActivityLogs(currentTeamId).then(setLogs).catch((err) => console.error(err))
    })
  }

  function handleCycleStatus(taskId) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    runTaskAction(taskId, async () => {
      const updated = await updateTaskStatus(
        currentTeamId,
        taskId,
        NEXT_STATUS[task.status] || 'pending',
        currentMemberId
      )
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      getActivityLogs(currentTeamId).then(setLogs).catch((err) => console.error(err))
    })
  }

  function handleDeleteTask(taskId) {
    runTaskAction(taskId, async () => {
      const archived = await archiveTask(currentTeamId, taskId, currentMemberId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setArchivedTasks((prev) => [archived, ...prev])
    })
  }

  function handleRestoreTask(taskId) {
    runTaskAction(taskId, async () => {
      await restoreTask(currentTeamId, taskId, currentMemberId)
      setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId))
      // 복원된 태스크는 created_at이 예전 값이라 맨 앞에 끼워 넣으면 정렬이 어긋날 수 있어
      // 서버가 정렬해서 내려주는 목록을 다시 받아옴
      const refreshed = await getTasks(currentTeamId)
      setTasks(refreshed)
    })
  }

  // 인라인 편집(제목/담당자/마감일)은 저장이 끝나야 입력창이 표시로 돌아가므로
  // runTaskAction의 Promise를 그대로 반환해서 호출한 쪽에서 await 할 수 있게 함
  function handleUpdateTitle(taskId, title) {
    return runTaskAction(taskId, async () => {
      const updated = await updateTaskTitle(currentTeamId, taskId, title, currentMemberId)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  function handleUpdateAssignee(taskId, assigneeId) {
    return runTaskAction(taskId, async () => {
      const updated = await updateTaskAssignee(currentTeamId, taskId, assigneeId, currentMemberId)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  function handleUpdateDueDate(taskId, dueDate) {
    return runTaskAction(taskId, async () => {
      const updated = await updateTaskDueDate(currentTeamId, taskId, dueDate, currentMemberId)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  if (isCheckingTeam) {
    return null
  }

  if (currentTeamId === null) {
    return (
      <div className="page">
        <TeamJoin onJoin={handleTeamJoined} />
      </div>
    )
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
            <AddTaskForm currentTeamId={currentTeamId} members={members} onTaskAdded={handleTaskAdded} />
            <ArchivedTasks
              archivedTasks={archivedTasks}
              members={members}
              currentMemberId={currentMemberId}
              pendingTaskIds={pendingTaskIds}
              onRestore={handleRestoreTask}
              showToast={showToast}
            />
            <ActivityLog logs={logs} />
          </>
        ) : (
          <MeetingMatch members={members} currentMemberId={currentMemberId} currentTeamId={currentTeamId} />
        )}
      </div>
      <Toast message={toastMessage} />
    </>
  )
}

export default App
