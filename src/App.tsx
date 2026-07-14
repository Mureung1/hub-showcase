import { useState } from 'react'
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
  // progress: { [taskId]: checked } 형태. profile과 분리된 이유는
  // "조건 다시 입력" 시 체크 상태를 유지하기 위함
  const [progress, setProgress] = useLocalStorage<Record<string, boolean>>('progress', {})
  // 대시보드에서 "조건 다시 입력" 버튼을 눌렀을 때 온보딩 폼으로 되돌아가는 플래그
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  // 첫 방문자에게만 랜딩 페이지를 보여주기 위한 플래그
  const [showLanding, setShowLanding] = useState(true)

  // 체크박스 클릭 시 해당 taskId의 checked 값을 반전
  function handleToggle(taskId: string) {
    setProgress((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  // 온보딩 완료 또는 조건 재입력 완료 시 호출
  function handleComplete(newProfile: Profile) {
    setProfile(newProfile)
    setIsEditingProfile(false)
  }

  function handleResetProgress() {
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
      onToggle={handleToggle}
      onEditProfile={() => setIsEditingProfile(true)}
      onResetProgress={handleResetProgress}
    />
  )
}

export default App
