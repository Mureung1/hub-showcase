import { useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { Profile } from './types'
import Landing from './components/Landing'
import OnboardingForm from './components/OnboardingForm'
import Dashboard from './components/Dashboard'

// 화면 전환을 라우터 없이 상태만으로 관리한다.
// 흐름: Landing → OnboardingForm → Dashboard
// 재방문 시: localStorage에 profile이 있으면 Dashboard로 바로 진입
function App() {
  // profile: 온보딩 5문항 답변. null이면 온보딩 미완료
  const [profile, setProfile] = useLocalStorage<Profile | null>('profile', null)
  // progress 초기값을 빈 객체로 시작하고, 마운트 시 서버에서 불러온다
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  // 현재 토글 요청 중인 taskId. null이면 대기 중인 요청 없음
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  // 대시보드에서 "조건 다시 입력" 버튼을 눌렀을 때 온보딩 폼으로 되돌아가는 플래그
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  // 첫 방문자에게만 랜딩 페이지를 보여주기 위한 플래그
  const [showLanding, setShowLanding] = useState(true)

  // 마운트 시 서버에서 progress 초기값 fetch — 새로고침 후 체크 상태 복원
  useEffect(() => {
    fetch('http://localhost:4000/api/progress', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setProgress(data))
      .catch(() => {}) // 서버 오류 시 빈 상태 유지
  }, [])

  async function handleToggle(taskId: string) {
    // 낙관적 업데이트: 서버 응답 전에 UI를 먼저 반영
    setProgress((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
    setLoadingTaskId(taskId)
    try {
      const res = await fetch(
        `http://localhost:4000/api/progress/${taskId}/toggle`,
        { method: 'POST', credentials: 'include' }
      )
      if (!res.ok) throw new Error('toggle failed')
      const data = await res.json()
      // 서버 응답값으로 낙관적 업데이트 보정
      setProgress((prev) => ({ ...prev, [taskId]: data.checked }))
    } catch {
      // 실패 시 낙관적 업데이트 롤백
      setProgress((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
    } finally {
      setLoadingTaskId(null)
    }
  }

  // 온보딩 완료 또는 조건 재입력 완료 시 호출
  function handleComplete(newProfile: Profile) {
    setProfile(newProfile)
    setIsEditingProfile(false)
  }

  async function handleResetProgress() {
    await fetch('http://localhost:4000/api/progress/reset', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    setProgress({})
  }

  // profile이 없고 랜딩을 아직 안 지나쳤으면 랜딩 표시
  if (!profile && showLanding) {
    return <Landing onStart={() => setShowLanding(false)} />
  }

  // profile이 없거나 조건 재입력 중이면 온보딩 폼 표시.
  // initialProfile을 넘기면 기존 값이 미리 채워진 상태로 열린다
  if (!profile || isEditingProfile) {
    return <OnboardingForm onComplete={handleComplete} initialProfile={profile} />
  }

  return (
    <Dashboard
      profile={profile}
      progress={progress}
      loadingTaskId={loadingTaskId}
      onToggle={handleToggle}
      onEditProfile={() => setIsEditingProfile(true)}
      onResetProgress={handleResetProgress}
    />
  )
}

export default App
