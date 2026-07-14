import { useState } from 'react'
import ProjectIntro from './components/ProjectIntro.jsx'
import CertPlanner from './components/CertPlanner.jsx'

function App() {
  const [view, setView] = useState('planner')

  return (
    <div className="app">
      <nav className="app__tabs">
        <button
          type="button"
          className={`app__tab ${view === 'planner' ? 'app__tab--active' : ''}`}
          onClick={() => setView('planner')}
        >
          자격증 랭킹
        </button>
        <button
          type="button"
          className={`app__tab ${view === 'intro' ? 'app__tab--active' : ''}`}
          onClick={() => setView('intro')}
        >
          프로젝트 소개
        </button>
      </nav>

      <div className="app__content">{view === 'planner' ? <CertPlanner /> : <ProjectIntro />}</div>
    </div>
  )
}

export default App
