import { useState, useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Auth from './pages/Auth'
import ProfileSetup from './pages/ProfileSetup'
import DashboardLayout from './pages/DashboardLayout'
import CalendarPage from './pages/CalendarPage'
import ScrapListPage from './pages/ScrapListPage'
import { tokenManager, authApi } from './utils/apiClient'
import { initializePushNotifications } from './utils/pushNotification'

type AppPage = 'auth' | 'profile' | 'dashboard' | 'calendar' | 'scraps'

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('auth')
  const [isLoading, setIsLoading] = useState(true)

  // 개발 환경: localStorage 완전 초기화
  useEffect(() => {
    if (import.meta.env.DEV) {
      // URL 파라미터에 ?keep=true 있으면 토큰 유지, 아니면 초기화
      const params = new URLSearchParams(window.location.search)
      const shouldKeepToken = params.get('keep') === 'true'

      if (!shouldKeepToken) {
        // 기본: 개발 환경에서는 localStorage 초기화 (테스트 용이)
        console.log('개발 환경: localStorage 초기화')
        tokenManager.clearTokens()
      } else {
        // ?keep=true이면 기존 토큰 검증
        const token = tokenManager.getAccessToken()
        if (token) {
          try {
            const decoded = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
            const now = Date.now() / 1000
            if (decoded.exp && decoded.exp < now) {
              console.log('만료된 토큰 감지, 초기화합니다.')
              tokenManager.clearTokens()
            }
          } catch (e) {
            console.log('토큰 파싱 실패, 초기화합니다.')
            tokenManager.clearTokens()
          }
        }
      }
    }
  }, [])

  const checkProfileAndNavigate = async (hasToken: boolean) => {
    if (!hasToken) {
      setCurrentPage('auth')
      return
    }

    try {
      const response = await authApi.checkProfileStatus()
      if (response?.hasProfile) {
        setCurrentPage('dashboard')
        // 대시보드 진입 시 푸시 알림 초기화
        setTimeout(() => {
          initializePushNotifications().catch(err =>
            console.error('푸시 알림 초기화 실패:', err)
          )
        }, 1000)
      } else {
        setCurrentPage('profile')
      }
    } catch (error) {
      // 토큰이 만료되었거나 유효하지 않음
      console.log('토큰 검증 실패, 로그인 페이지로 이동')
      tokenManager.clearTokens()
      setCurrentPage('auth')
    }
  }

  useEffect(() => {
    const token = tokenManager.getAccessToken()
    checkProfileAndNavigate(!!token)
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
          onAuthSuccess={async () => {
            // 로그인 성공 후 프로필 상태 확인
            await checkProfileAndNavigate(true)
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

      {/* 5. 스크랩 목록 페이지 */}
      {currentPage === 'scraps' && <ScrapListPage setCurrentPage={setCurrentPage} />}
    </>
  )

  if (googleClientId) {
    return <GoogleOAuthProvider clientId={googleClientId}>{appContent}</GoogleOAuthProvider>
  }

  return appContent
}

export default App
