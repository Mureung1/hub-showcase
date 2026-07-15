import { Routes, Route } from 'react-router-dom'
import ProjectIntro from './ProjectIntro'
import RoutineToday from './pages/RoutineToday'
import Onboarding from './pages/Onboarding'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectIntro />} />
      <Route path="/routine" element={<RoutineToday />} />
      <Route path="/onboarding" element={<Onboarding />} />
    </Routes>
  )
}

export default App
