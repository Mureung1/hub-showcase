import { useState, useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Auth from './pages/Auth'
import ProfileSetup from './pages/ProfileSetup'
import DashboardLayout from './pages/DashboardLayout'
import CalendarPage from './pages/CalendarPage'
import ScrapListPage from './pages/ScrapListPage'
import SettingsPage from './pages/SettingsPage'
import GithubReposPage from './pages/GithubReposPage'
import { tokenManager, authApi } from './utils/apiClient'
import { initializePushNotifications } from './utils/pushNotification'

type AppPage = 'dashboard' | 'calendar' | 'scraps' | 'settings' | 'github' | 'auth' | 'profile'

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('auth')
  const [isLoading, setIsLoading] = useState(true)

  // 현재 페이지를 localStorage에 저장
  const saveCurrentPage = (page: AppPage) => {
    setCurrentPage(page)
    localStorage.setItem('currentPage', page)
  }

  // localStorage에서 저장된 페이지 복원
  const getSavedPage = (): AppPage => {
    const saved = localStorage.getItem('currentPage')
    return (saved as AppPage) || 'auth'
  }

  // 저장된 토큰 유효성 검사
  useEffect(() => {
    const token = tokenManager.getAccessToken()
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
        const now = Date.now() / 1000
        if (decoded.exp && decoded.exp < now) {
          console.log('⏰ 토큰 만료됨, 초기화합니다.')
          tokenManager.clearTokens()
        } else {
          console.log('✅ 저장된 토큰 유효함')
        }
      } catch (e) {
        console.log('❌ 토큰 파싱 실패, 초기화합니다.')
        tokenManager.clearTokens()
      }
    }
  }, [])

  const checkProfileAndNavigate = async (hasToken: boolean) => {
    if (!hasToken) {
      localStorage.removeItem('currentPage')
      setCurrentPage('auth')
      return
    }

    try {
      const response = await authApi.checkProfileStatus()
      if (response?.hasProfile) {
        // 저장된 페이지가 있으면 복원, 없으면 대시보드로
        const savedPage = getSavedPage()
        const targetPage = (savedPage !== 'auth' && savedPage !== 'profile') ? savedPage : 'dashboard'

        setCurrentPage(targetPage)

        // 대시보드 또는 로그인 페이지 진입 시 푸시 알림 초기화
        if (targetPage !== 'auth' && targetPage !== 'profile') {
          setTimeout(() => {
            initializePushNotifications().catch(err =>
              console.error('푸시 알림 초기화 실패:', err)
            )
          }, 1000)
        }
      } else {
        setCurrentPage('profile')
        localStorage.removeItem('currentPage')
      }
    } catch (error) {
      // 토큰이 만료되었거나 유효하지 않음
      console.log('토큰 검증 실패, 로그인 페이지로 이동')
      tokenManager.clearTokens()
      localStorage.removeItem('currentPage')
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
              saveCurrentPage('dashboard')
            }}
          />
        </div>
      )}

      {/* 3. 프로필 완료 후 → Dashboard 페이지 */}
      {currentPage === 'dashboard' && <DashboardLayout setCurrentPage={saveCurrentPage} />}

      {/* 4. 캘린더 페이지 */}
      {currentPage === 'calendar' && <CalendarPage setCurrentPage={saveCurrentPage} />}

      {/* 5. 스크랩 목록 페이지 */}
      {currentPage === 'scraps' && <ScrapListPage setCurrentPage={saveCurrentPage} />}

      {/* 6. 설정 페이지 */}
      {currentPage === 'settings' && <SettingsPage setCurrentPage={saveCurrentPage} />}

      {/* 7. GitHub 인기 저장소 페이지 */}
      {currentPage === 'github' && <GithubReposPage setCurrentPage={saveCurrentPage} />}
    </>
  )

  if (googleClientId) {
    return <GoogleOAuthProvider clientId={googleClientId}>{appContent}</GoogleOAuthProvider>
  }

  return appContent
}

export default App
