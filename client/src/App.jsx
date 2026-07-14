import { Routes, Route } from "react-router-dom"
import Dashboard from "./pages/Dashboard.jsx"
import Reader from "./pages/Reader.jsx"
import MyPage from "./pages/MyPage.jsx"
import Vocabulary from "./pages/Vocabulary.jsx"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/reader" element={<Reader />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/vocabulary" element={<Vocabulary />} />
    </Routes>
  )
}

export default App
