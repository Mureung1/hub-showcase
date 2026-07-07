import { Routes, Route, NavLink } from 'react-router-dom'
import ScreenList from './screens/ScreenList.jsx'
import FlowDiagram from './screens/FlowDiagram.jsx'
import Home from './screens/Home.jsx'
import Input from './screens/Input.jsx'
import Processing from './screens/Processing.jsx'
import Result from './screens/Result.jsx'
import Adjust from './screens/Adjust.jsx'

function App() {
  return (
    <div className="app-shell">
      <nav className="top-nav">
        <span className="brand">시험 벼락치기 스케줄러 · 와이어프레임</span>
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          화면 목록
        </NavLink>
        <NavLink to="/flow" className={({ isActive }) => (isActive ? 'active' : '')}>
          화면 흐름
        </NavLink>
        <NavLink to="/screen/home" className={({ isActive }) => (isActive ? 'active' : '')}>
          1. 홈
        </NavLink>
        <NavLink to="/screen/input" className={({ isActive }) => (isActive ? 'active' : '')}>
          2. 정보 입력
        </NavLink>
        <NavLink to="/screen/processing" className={({ isActive }) => (isActive ? 'active' : '')}>
          3. 처리 중
        </NavLink>
        <NavLink to="/screen/result" className={({ isActive }) => (isActive ? 'active' : '')}>
          4. 결과
        </NavLink>
        <NavLink to="/screen/adjust" className={({ isActive }) => (isActive ? 'active' : '')}>
          5. 스케줄 조정
        </NavLink>
      </nav>
      <div className="stage">
        <Routes>
          <Route path="/" element={<ScreenList />} />
          <Route path="/flow" element={<FlowDiagram />} />
          <Route path="/screen/home" element={<Home />} />
          <Route path="/screen/input" element={<Input />} />
          <Route path="/screen/processing" element={<Processing />} />
          <Route path="/screen/result" element={<Result />} />
          <Route path="/screen/adjust" element={<Adjust />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
