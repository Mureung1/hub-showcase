import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Intro from './pages/Intro.jsx'
import Overview from './pages/Overview.jsx'
import Problem from './pages/Problem.jsx'
import ServiceFlow from './pages/ServiceFlow.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/problem" element={<Problem />} />
        <Route path="/service-flow" element={<ServiceFlow />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
