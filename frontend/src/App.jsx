import { Routes, Route } from 'react-router-dom'
import Landing from './components/Landing.jsx'
import AppFlowLayout from './components/AppFlowLayout.jsx'
import IdInput from './components/IdInput.jsx'
import Analyze from './components/Analyze.jsx'
import Profile from './components/Profile.jsx'
import IssueSearch from './components/IssueSearch.jsx'
import Result from './components/Result.jsx'
import Detail from './components/Detail.jsx'
import History from './components/History.jsx'

// 화면 흐름(프로토타입 기준):
// 랜딩 → ID입력 → 분석중 → 프로필결과 → 조건검색 → 추천목록 → 상세
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppFlowLayout />}>
        <Route path="/input" element={<IdInput />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/search" element={<IssueSearch />} />
        <Route path="/result" element={<Result />} />
        <Route path="/detail" element={<Detail />} />
        <Route path="/history" element={<History />} />
      </Route>
    </Routes>
  )
}

export default App
