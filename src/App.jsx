import { Routes, Route } from 'react-router-dom'
import ProjectIntro from './ProjectIntro'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectIntro />} />
    </Routes>
  )
}

export default App
