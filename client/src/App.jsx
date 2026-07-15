import { Routes, Route, useLocation } from "react-router-dom"
import Sidebar from "./components/Sidebar.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Reader from "./pages/Reader.jsx"
import MyPage from "./pages/MyPage.jsx"
import Vocabulary from "./pages/Vocabulary.jsx"

function App() {
  const location = useLocation()
  const showSidebar = location.pathname !== "/reader"

  const routes = (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/reader" element={<Reader />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/vocabulary" element={<Vocabulary />} />
    </Routes>
  )

  if (!showSidebar) return routes

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">{routes}</div>
    </div>
  )
}

export default App
