import { useState, useEffect } from 'react'
import type { Profile } from './types'
import Landing from './components/Landing'
import OnboardingForm from './components/OnboardingForm'
import Dashboard from './components/Dashboard'

const API = import.meta.env.VITE_API_URL as string

// 화면 전환을 라우터 없이 상태만으로 관리한다.
// 흐름: Landing → OnboardingForm → Dashboard
// 재방문 시: localStorage에 profile이 있으면 Dashboard로 바로 진입
function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [progress, setProgress] = useState<Record<string, { checked: boolean; completedAt: string | null; memo: string }>>({})
  const [taskIds, setTaskIds] = useState<string[] | null>(null)
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  // 마운트 시 서버에서 profile + progress + tasks 동시 복원
  // allSettled: 하나가 실패해도 나머지 fetch는 계속 진행
  useEffect(() => {
    Promise.allSettled([
      fetch(`${API}/api/profile`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => { if (data?.industry) setProfile(data) }),
      fetch(`${API}/api/progress`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => setProgress(data)),
      fetch(`${API}/api/tasks`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => { if (data?.taskIds) setTaskIds(data.taskIds) }),
    ]).then((results) => {
      if (results.some((r) => r.status === 'rejected')) setApiError(true)
      setIsLoading(false)
    })
  }, [])

  async function handleToggle(taskId: string) {
    const original = progress[taskId] ?? { checked: false, completedAt: null, memo: '' }
    // 낙관적 업데이트: 서버 응답 전에 UI를 먼저 반영
    setProgress((prev) => ({ ...prev, [taskId]: { ...original, checked: !original.checked, completedAt: null } }))
    setLoadingTaskId(taskId)
    try {
      const res = await fetch(
        `${API}/api/progress/${taskId}/toggle`,
        { method: 'POST', credentials: 'include' }
      )
      if (!res.ok) throw new Error('toggle failed')
      const data = await res.json()
      setProgress((prev) => ({
        ...prev,
        [taskId]: { memo: prev[taskId]?.memo ?? '', checked: data.checked, completedAt: data.completedAt },
      }))
    } catch {
      setProgress((prev) => ({ ...prev, [taskId]: original }))
    } finally {
      setLoadingTaskId(null)
    }
  }

  async function handleMemo(taskId: string, memo: string) {
    setProgress((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] ?? { checked: false, completedAt: null }), memo },
    }))
    await fetch(`${API}/api/progress/${taskId}/memo`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo }),
    }).catch(() => {})
  }

  async function handleComplete(newProfile: Profile) {
    setProfile(newProfile)
    setIsEditingProfile(false)
    await fetch(`${API}/api/profile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile),
    }).catch(() => {})
    fetch(`${API}/api/tasks`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { if (data?.taskIds) setTaskIds(data.taskIds) })
      .catch(() => {})
  }

  async function handleResetProgress() {
    await fetch(`${API}/api/progress/reset`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    setProgress((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, val]) => [id, { ...val, checked: false, completedAt: null }])
      )
    )
  }

  if (!profile && showLanding) {
    return <Landing onStart={() => setShowLanding(false)} />
  }

  if (!profile || isEditingProfile) {
    return <OnboardingForm onComplete={handleComplete} initialProfile={profile} />
  }

  return (
    <Dashboard
      profile={profile}
      progress={progress}
      taskIds={taskIds}
      loadingTaskId={loadingTaskId}
      isLoading={isLoading}
      apiError={apiError}
      onToggle={handleToggle}
      onMemo={handleMemo}
      onEditProfile={() => setIsEditingProfile(true)}
      onResetProgress={handleResetProgress}
    />
  )
}

export default App
