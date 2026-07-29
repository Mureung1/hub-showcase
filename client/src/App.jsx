import { Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext.jsx"
import Sidebar from "./components/Sidebar.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Reader from "./pages/Reader.jsx"
import InsightNote from "./pages/InsightNote.jsx"
import Vocabulary from "./pages/Vocabulary.jsx"
import Login from "./pages/Login.jsx"

function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reader" element={<Reader />} />
            <Route path="/mypage" element={<InsightNote />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  )
}

export default App
