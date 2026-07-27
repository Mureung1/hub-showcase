import { Routes, Route } from 'react-router-dom'
import RoutineToday from './pages/RoutineToday'
import Onboarding from './pages/Onboarding'
import OnboardingReview from './pages/OnboardingReview'
import PainReport from './pages/PainReport'
import Records from './pages/Records'

function App() {
  return (
    <Routes>
      <Route path="/" element={<RoutineToday />} />
      <Route path="/routine" element={<RoutineToday />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding/review" element={<OnboardingReview />} />
      <Route path="/pain-report/:routineDayId" element={<PainReport />} />
      <Route path="/records" element={<Records />} />
    </Routes>
  )
}

export default App
