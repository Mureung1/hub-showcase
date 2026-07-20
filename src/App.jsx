import { Routes, Route } from 'react-router-dom'
import ProjectIntro from './ProjectIntro'
import RoutineToday from './pages/RoutineToday'
import Onboarding from './pages/Onboarding'
import OnboardingReview from './pages/OnboardingReview'
import PainReport from './pages/PainReport'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectIntro />} />
      <Route path="/routine" element={<RoutineToday />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding/review" element={<OnboardingReview />} />
      <Route path="/pain-report/:routineDayId" element={<PainReport />} />
    </Routes>
  )
}

export default App
