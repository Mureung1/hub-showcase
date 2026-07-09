import { useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { Profile } from './types'
import Landing from './components/Landing'
import OnboardingForm from './components/OnboardingForm'
import Dashboard from './components/Dashboard'

function App() {
  const [profile, setProfile] = useLocalStorage<Profile | null>('profile', null)
  const [progress, setProgress] = useLocalStorage<Record<string, boolean>>('progress', {})
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [showLanding, setShowLanding] = useState(true)

  function handleToggle(taskId: string) {
    setProgress((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  function handleComplete(newProfile: Profile) {
    setProfile(newProfile)
    setIsEditingProfile(false)
  }

  function handleResetProgress() {
    setProgress({})
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
      onToggle={handleToggle}
      onEditProfile={() => setIsEditingProfile(true)}
      onResetProgress={handleResetProgress}
    />
  )
}

export default App
