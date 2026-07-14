import { Route, Routes } from 'react-router-dom'
import DevNav from './components/DevNav.tsx'
import ProjectIntro from './components/ProjectIntro.tsx'
import CalendarPage from './pages/CalendarPage.tsx'
import RecordPage from './pages/RecordPage.tsx'
import RoomPage from './pages/RoomPage.tsx'
import RoomsPage from './pages/RoomsPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'

function App() {
  return (
    <>
      <DevNav />
      <Routes>
        <Route element={<ProjectIntro />} path="/" />
        <Route element={<RecordPage />} path="/record" />
        <Route element={<CalendarPage />} path="/calendar" />
        <Route element={<RoomsPage />} path="/rooms" />
        <Route element={<RoomPage />} path="/rooms/:id" />
        <Route element={<SettingsPage />} path="/settings" />
      </Routes>
    </>
  )
}

export default App
