import { useState } from 'react'
import './App.css'
import GlobalHeader from './components/GlobalHeader'
import ProfileBoard from './components/ProfileBoard'
import CurationWorkspace from './components/CurationWorkspace'
import { CurationData } from './types'

function App() {
  const [lang, setLang] = useState<'KO' | 'EN'>('KO')
  const [curationData, setCurationData] = useState<CurationData | null>(null)

  return (
    <div className="app-container">
      {/* A. Global Header */}
      <GlobalHeader lang={lang} setLang={setLang} />

      {/* B. 2x2 Bento Grid Area */}
      <main className="bento-grid">
        {/* Top Row: Profile (75%) & Curation Board (25%) */}
        <ProfileBoard lang={lang} setCurationData={setCurationData} />
        
        {/* Bottom Row: Results & Workspace (100%) */}
        <CurationWorkspace lang={lang} curationData={curationData} />
      </main>
    </div>
  )
}

export default App
