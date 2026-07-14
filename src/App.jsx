import { Routes, Route } from 'react-router-dom'
import ProjectIntro from './ProjectIntro'
import RoutineToday from './pages/RoutineToday'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectIntro />} />
      <Route path="/routine" element={<RoutineToday />} />
    </Routes>
  )
}

export default App
