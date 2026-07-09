import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import ProjectIntro from './components/ProjectIntro.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ConditionsPage from './pages/ConditionsPage.jsx'
import JournalPage from './pages/JournalPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectIntro />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/conditions" element={<ConditionsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/review/:tradeId" element={<ReviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
