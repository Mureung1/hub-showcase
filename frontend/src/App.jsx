import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HobbyTestPage from './pages/HobbyTestPage'
import DatingTestPage from './pages/DatingTestPage'
import LifestyleTestPage from './pages/LifestyleTestPage'
import PurposeSelectPage from './pages/PurposeSelectPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/test/hobby" element={<HobbyTestPage />} />
        <Route path="/test/dating" element={<DatingTestPage />} />
        <Route path="/test/lifestyle" element={<LifestyleTestPage />} />
        <Route path="/select-purpose" element={<PurposeSelectPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
