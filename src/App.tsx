import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { OnboardingProvider } from './context/OnboardingContext'
import WelcomeScreen from './pages/WelcomeScreen'
import OnboardingStep from './pages/OnboardingStep'
import CompleteScreen from './pages/CompleteScreen'
import HomeScreen from './pages/HomeScreen'
import SubsidyDetailScreen from './pages/SubsidyDetailScreen'
import ProjectIntro from './components/ProjectIntro'

function App() {
  return (
    <OnboardingProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/onboarding/:step" element={<OnboardingStep />} />
          <Route path="/onboarding/complete" element={<CompleteScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/subsidies/:id" element={<SubsidyDetailScreen />} />
          <Route path="/intro" element={<ProjectIntro />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </OnboardingProvider>
  )
}

export default App
