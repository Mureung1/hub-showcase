import { BrowserRouter, Routes, Route } from 'react-router-dom'
import InputPage from './pages/InputPage'
import DashboardPage from './pages/DashboardPage'
import HypothesisDetailPage from './pages/HypothesisDetailPage'
import SharePage from './pages/SharePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InputPage />} />
        <Route path="/projects/:id" element={<DashboardPage />} />
        <Route path="/projects/:id/hypotheses/:hid" element={<HypothesisDetailPage />} />
        <Route path="/share/:token" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
