import { Routes, Route } from 'react-router-dom'
import { AppStateProvider } from './context/AppStateContext'
import { AuthProvider } from './context/AuthContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import LandingPage from './pages/LandingPage'
import FilterPage from './pages/FilterPage'
import SpecPage from './pages/SpecPage'
import ResultPage from './pages/ResultPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import BookmarksPage from './pages/BookmarksPage'
import GuidePage from './pages/GuidePage'
import './styles/tokens.css'
import './App.css'

function App() {
  return (
    // <Routes> 상위에 마운트해야 라우트 전환 시 Provider가 리마운트되지 않고 filters/spec/result가 유지된다.
    // AuthProvider는 AppStateProvider와 별개 관심사(로그인 세션 vs 갭 분석 진행 상태)라 나란히 둔다.
    <AppStateProvider>
      <AuthProvider>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/filter" element={<FilterPage />} />
            <Route path="/spec" element={<SpecPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/guide" element={<GuidePage />} />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </AppStateProvider>
  )
}

export default App