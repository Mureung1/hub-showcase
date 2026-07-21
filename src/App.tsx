import { useEffect, useState } from 'react'
import { refreshSession, type AuthUser } from './auth/authClient'
import { Scheduler } from './components/Scheduler'
import { LoginView } from './components/scheduler/LoginView'

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false

    refreshSession()
      .then((refreshedUser) => {
        if (!cancelled) setUser(refreshedUser)
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (checkingSession) return null
  if (!user) return <LoginView onAuthenticated={setUser} />

  return <Scheduler user={user} onLogout={() => setUser(null)} />
}
