import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HobbyTestPage from './pages/HobbyTestPage'
import DatingTestPage from './pages/DatingTestPage'
import LifestyleTestPage from './pages/LifestyleTestPage'
import PurposeSelectPage from './pages/PurposeSelectPage'
import RoommateTypeSelectPage from './pages/RoommateTypeSelectPage'
import TeamSizeSelectPage from './pages/TeamSizeSelectPage'
import MatchResultsPage from './pages/MatchResultsPage'
import DatingSameResultsPage from './pages/DatingSameResultsPage'
import DatingOppositeResultsPage from './pages/DatingOppositeResultsPage'
import TeamSetupPage from './pages/TeamSetupPage'
import ChatRoomPage from './pages/ChatRoomPage'

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
        <Route path="/select-roommate-type" element={<RoommateTypeSelectPage />} />
        <Route path="/select-team-size" element={<TeamSizeSelectPage />} />
        <Route path="/matches" element={<MatchResultsPage />} />
        <Route path="/matching/dating-same" element={<DatingSameResultsPage />} />
        <Route path="/matching/dating-opposite" element={<DatingOppositeResultsPage />} />
        <Route path="/team-setup" element={<TeamSetupPage />} />
        <Route path="/chat/:chatRoomId" element={<ChatRoomPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
