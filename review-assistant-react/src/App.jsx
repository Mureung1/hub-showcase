import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage.jsx'
import ToolPage from './pages/ToolPage.jsx'
import GuidePage from './pages/GuidePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MyReviewsPage from './pages/MyReviewsPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<ToolPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/my-reviews" element={<MyReviewsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
