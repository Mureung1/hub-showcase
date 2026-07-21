import { Routes, Route } from 'react-router-dom'
import { AppStateProvider } from './context/AppStateContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import LandingPage from './pages/LandingPage'
import FilterPage from './pages/FilterPage'
import SpecPage from './pages/SpecPage'
import ResultPage from './pages/ResultPage'
import './styles/tokens.css'
import './App.css'

function App() {
  return (
    // <Routes> 상위에 마운트해야 라우트 전환 시 Provider가 리마운트되지 않고 filters/spec/result가 유지된다.
    <AppStateProvider>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/filter" element={<FilterPage />} />
          <Route path="/spec" element={<SpecPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </main>
      <Footer />
    </AppStateProvider>
  )
}

export default App