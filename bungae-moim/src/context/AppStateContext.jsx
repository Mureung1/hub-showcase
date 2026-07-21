import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { MEETINGS } from '../data/mockData.js'
import {
  exchangeOAuthCode,
  fetchMe,
  requestLogout,
  startOAuthLogin,
  takePendingOAuthCode,
} from '../api/auth.js'
import { updateMe } from '../api/users.js'

const AppStateContext = createContext(null)

// 비로그인 상태에서도 화면이 `currentUser.id` 같은 접근을 하므로, null 대신 빈 사용자를
// 넘겨 화면이 터지지 않게 한다. id가 null이라 "내 모임"이나 "내 신청"에는 걸리지 않는다.
const GUEST_USER = { id: null, nickname: '', email: '', birthDate: null, trustScore: 0 }

// StrictMode(개발 모드)는 마운트 시 effect를 두 번 실행한다. OAuth 인가 코드는 일회용이라
// 두 번째 실행이 코드를 다시 쓰려 하면 실패하고, 첫 실행의 결과는 버려져 "로그인했는데
// 로그아웃 상태로 보이는" 경합이 생긴다. 부트스트랩을 모듈 단위 프로미스로 딱 한 번만
// 실행하고, 두 번째 실행은 같은 결과를 재사용하게 해서 이 경합을 없앤다.
let sessionBootstrap = null

function bootstrapSession() {
  if (sessionBootstrap) return sessionBootstrap

  sessionBootstrap = (async () => {
    const pending = takePendingOAuthCode()
    let error = null

    if (pending) {
      try {
        await exchangeOAuthCode(pending.provider, pending.code)
      } catch (err) {
        error = err.message
      }
    }

    try {
      return { user: await fetchMe(), error }
    } catch {
      // 401(비로그인)은 정상적인 상태이므로 조용히 넘어간다.
      return { user: null, error }
    }
  })()

  return sessionBootstrap
}

export function AppStateProvider({ children }) {
  const [meetings, setMeetings] = useState(MEETINGS)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // 앱이 처음 뜰 때 두 가지를 처리한다.
  // 1) 소셜 로그인에서 막 돌아온 경우(?code=...) → 백엔드에 코드를 넘겨 세션을 발급받는다.
  // 2) 그 외의 경우 → 이미 로그인된 세션이 남아있는지 확인한다(새로고침해도 로그인 유지).
  useEffect(() => {
    let cancelled = false

    bootstrapSession().then(({ user: restoredUser, error }) => {
      if (cancelled) return
      setUser(restoredUser)
      setAuthError(error)
      setAuthLoading(false)

      // 소셜 로그인이 실패하면 에러 문구는 로그인 화면에만 있으므로, 그리로 돌려보낸다.
      // (구글에서 돌아오면 해시가 지워져 홈에 떨어지기 때문)
      if (error) window.location.hash = '#/login'
    })

    return () => {
      cancelled = true
    }
  }, [])

  const isLoggedIn = user !== null
  const currentUser = user ?? GUEST_USER

  const value = useMemo(() => {
    function updateMeeting(id, updater) {
      setMeetings((prev) => prev.map((m) => (m.id === id ? updater(m) : m)))
    }

    function respondToApplicant(meetingId, userId, decision) {
      updateMeeting(meetingId, (meeting) => ({
        ...meeting,
        participants: meeting.participants.map((p) => (p.userId === userId ? { ...p, status: decision } : p)),
      }))
    }

    function cancelMeeting(meetingId) {
      updateMeeting(meetingId, (meeting) => ({
        ...meeting,
        status: 'cancelled',
        participants: meeting.participants.map((p) => ({ ...p, status: 'cancelled' })),
      }))
    }

    // 구글/카카오 동의 화면으로 떠난다. 돌아오면 위 useEffect가 이어받는다.
    function login(provider) {
      setAuthError(null)
      try {
        startOAuthLogin(provider)
      } catch (err) {
        setAuthError(err.message)
      }
    }

    async function logout() {
      try {
        await requestLogout()
      } finally {
        setUser(null)
      }
    }

    // 생년월일 최초 입력(D5). 성공하면 갱신된 사용자로 교체해 게이트가 닫히게 한다.
    async function saveBirthDate(birthDate) {
      const updated = await updateMe(birthDate)
      setUser(updated)
    }

    return {
      meetings,
      currentUser,
      isLoggedIn,
      authLoading,
      authError,
      login,
      logout,
      saveBirthDate,
      respondToApplicant,
      cancelMeeting,
    }
  }, [meetings, currentUser, isLoggedIn, authLoading, authError])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
