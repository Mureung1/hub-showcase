import { useState, useEffect } from 'react'
import Auth from './pages/Auth'
import ProfileSetup from './pages/ProfileSetup'
import Dashboard from './pages/Dashboard'
import { tokenManager } from './utils/apiClient'

type AppPage = 'auth' | 'profile' | 'dashboard'

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('auth')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 저장된 토큰 확인
    const token = tokenManager.getAccessToken()
    if (token) {
      setCurrentPage('dashboard') // 프로필 설정 완료 후 대시보드로 이동했다고 가정
    }
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return <div className="min-h-screen bg-bg-secondary" />
  }

  // 1. 로그인 전 → Auth 페이지
  if (currentPage === 'auth') {
    return (
      <Auth
        onAuthSuccess={() => {
          setCurrentPage('profile')
        }}
      />
    )
  }

  // 2. 로그인 후 → ProfileSetup 페이지
  if (currentPage === 'profile') {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <ProfileSetup
          onProfileDone={() => {
            setCurrentPage('dashboard')
          }}
        />
      </div>
    )
  }

  // 3. 프로필 완료 후 → Dashboard 페이지
  return <Dashboard />
}

export default App
