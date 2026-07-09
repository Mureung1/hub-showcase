import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import FilterPage from './pages/FilterPage'
import SpecPage from './pages/SpecPage'
import ResultPage from './pages/ResultPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/filter" element={<FilterPage />} />
      <Route path="/spec" element={<SpecPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  )
}

export default App