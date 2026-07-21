import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import ArchivePage from './pages/ArchivePage.jsx'
import DocumentDetailPage from './pages/DocumentDetailPage.jsx'
import TemplatePickerPage from './pages/TemplatePickerPage.jsx'
import EditorPage from './pages/EditorPage.jsx'
import ChallengesPage from './pages/ChallengesPage.jsx'
import GuidePage from './pages/GuidePage.jsx'
import MyPage from './pages/MyPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import TutorialPage from './pages/TutorialPage.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/archive/:docId" element={<DocumentDetailPage />} />
        <Route path="/write" element={<TemplatePickerPage />} />
        <Route path="/write/:templateId" element={<EditorPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/me" element={<MyPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
      </Route>
    </Routes>
  )
}

export default App
