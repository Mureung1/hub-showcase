import { useEffect, useState } from 'react'
import './App.css'
import AddTaskForm from './components/AddTaskForm'
import Header from './components/Header'
import ProgressCard from './components/ProgressCard'
import TaskList from './components/TaskList'
import { getTasks } from './api/tasks'
import { getMembers } from './api/members'
import { safeGetStoredMemberId, safeSetStoredMemberId } from './utils/storage'

function App() {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [currentMemberId, setCurrentMemberId] = useState(() => {
    const saved = safeGetStoredMemberId()
    return Number.isNaN(saved) ? null : saved
  })

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

  return (
    <div className="page">
      <Header
        members={members}
        currentMemberId={currentMemberId}
        onChangeCurrentMember={handleChangeCurrentMember}
      />
      <ProgressCard tasks={tasks} currentMemberId={currentMemberId} />
      <TaskList tasks={tasks} members={members} />
      <AddTaskForm members={members} onTaskAdded={handleTaskAdded} />
    </div>
  )
}

export default App
