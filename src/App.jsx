import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './services'
import { RoleLogin } from './features/auth'
import { CustomerLayout } from './features/customer'
import { OwnerDashboard } from './features/owner'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [authStatus, setAuthStatus] = useState('loading')
  const [profile, setProfile] = useState(null)

  const loadProfile = async (nextSession) => {
    if (!nextSession) {
      setProfile(null)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role, customer_id, cafe_id')
      .eq('id', nextSession.user.id)
      .single()

    if (error) {
      setProfile(null)
      return
    }

    setProfile(data)
  }

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()

      setSession(data.session)
      await loadProfile(data.session)
      setAuthStatus('idle')
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      await loadProfile(nextSession)
      setAuthStatus('idle')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])
  if (authStatus === 'loading') {
    return (
      <main className="app-shell role-screen">
        <section className="role-intro">
          <p className="eyebrow">Cafe Stamp MVP</p>
          <h1>로그인 상태를 확인하고 있어요</h1>
        </section>
      </main>
    )
  }

  const isLoggedIn = Boolean(session)
  const userRole = profile?.role
  const homePath = userRole === 'owner' ? '/owner' : '/customer'

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to={homePath} replace /> : <RoleLogin />}
      />
      <Route
        path="/customer"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="customer">
            <CustomerLayout profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/coupons"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="customer">
            <CustomerLayout profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/notifications"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="customer">
            <CustomerLayout profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/mypage"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="customer">
            <CustomerLayout profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} userRole={userRole} allowedRole="owner">
            <OwnerDashboard profile={profile} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}



function ProtectedRoute({ children, isLoggedIn, userRole, allowedRole }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (userRole && userRole !== allowedRole) {
    return (
      <Navigate
        to={userRole === 'owner' ? '/owner' : '/customer'}
        replace
      />
    )
  }

  return children
}



export default App
