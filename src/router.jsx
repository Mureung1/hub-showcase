import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from './context/UserContext.jsx'
import Header from './components/Header.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import Analyze from './pages/Analyze.jsx'
import Result from './pages/Result.jsx'

function RequireAuth({ children }) {
  const { user } = useUser()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/analyze"
          element={
            <RequireAuth>
              <Analyze />
            </RequireAuth>
          }
        />
        <Route
          path="/result"
          element={
            <RequireAuth>
              <Result />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
