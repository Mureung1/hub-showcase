import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage.jsx'
import ToolPage from './pages/ToolPage.jsx'
import GuidePage from './pages/GuidePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<ToolPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
