import { useState, useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Auth from './pages/Auth'
import ProfileSetup from './pages/ProfileSetup'
import DashboardLayout from './pages/DashboardLayout'
import CalendarPage from './pages/CalendarPage'
import { tokenManager } from './utils/apiClient'

type AppPage = 'auth' | 'profile' | 'dashboard' | 'calendar'

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

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

  if (isLoading) {
    return <div className="min-h-screen bg-bg-secondary" />
  }

  const appContent = (
    <>
      {/* 1. 로그인 전 → Auth 페이지 */}
      {currentPage === 'auth' && (
        <Auth
          onAuthSuccess={() => {
            setCurrentPage('profile')
          }}
        />
      )}

      {/* 2. 로그인 후 → ProfileSetup 페이지 */}
      {currentPage === 'profile' && (
        <div className="min-h-screen bg-bg-secondary">
          <ProfileSetup
            onProfileDone={() => {
              setCurrentPage('dashboard')
            }}
          />
        </div>
      )}

      {/* 3. 프로필 완료 후 → Dashboard 페이지 */}
      {currentPage === 'dashboard' && <DashboardLayout setCurrentPage={setCurrentPage} />}

      {/* 4. 캘린더 페이지 */}
      {currentPage === 'calendar' && <CalendarPage setCurrentPage={setCurrentPage} />}
    </>
  )

  if (googleClientId) {
    return <GoogleOAuthProvider clientId={googleClientId}>{appContent}</GoogleOAuthProvider>
  }

  return appContent
}

export default App
