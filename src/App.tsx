import { Route, Routes } from 'react-router-dom'
import AuthBanner from './components/AuthBanner.tsx'
import DevNav from './components/DevNav.tsx'
import ProjectIntro from './components/ProjectIntro.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import CalendarPage from './pages/CalendarPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import RecordPage from './pages/RecordPage.tsx'
import RoomPage from './pages/RoomPage.tsx'
import RoomsPage from './pages/RoomsPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import SignupPage from './pages/SignupPage.tsx'

function App() {
  return (
    <>
      <DevNav />
      <Routes>
        <Route
          element={
            <>
              <AuthBanner />
              <ProjectIntro />
            </>
          }
          path="/"
        />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<SignupPage />} path="/signup" />
        <Route
          element={
            <RequireAuth>
              <RecordPage />
            </RequireAuth>
          }
          path="/record"
        />
        <Route
          element={
            <RequireAuth>
              <CalendarPage />
            </RequireAuth>
          }
          path="/calendar"
        />
        <Route
          element={
            <RequireAuth>
              <RoomsPage />
            </RequireAuth>
          }
          path="/rooms"
        />
        <Route
          element={
            <RequireAuth>
              <RoomPage />
            </RequireAuth>
          }
          path="/rooms/:id"
        />
        <Route
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
          path="/settings"
        />
      </Routes>
    </>
  )
}

export default App
