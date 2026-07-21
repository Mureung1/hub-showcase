import { useState } from 'react'
import './App.css'
import GlobalHeader from './components/GlobalHeader'
import ProfileBoard from './components/ProfileBoard'
import CurationWorkspace from './components/CurationWorkspace'
import { CurationData } from './types'

function App() {
  const [lang, setLang] = useState<'KO' | 'EN'>('KO')
  const [curationData, setCurationData] = useState<CurationData | null>(null)
  
  // Lazy Initialization을 통한 MVP 유저 세션 구축
  const [userId] = useState<string>(() => {
    let id = localStorage.getItem('scholar_user_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      localStorage.setItem('scholar_user_id', id);
    }
    return id;
  });

  return (
    <div className="app-container">
      {/* A. Global Header */}
      <GlobalHeader lang={lang} setLang={setLang} />

      {/* B. 2x2 Bento Grid Area */}
      <main className="bento-grid">
        {/* Top Row: Profile (75%) & Curation Board (25%) */}
        <ProfileBoard lang={lang} setCurationData={setCurationData} />
        
        {/* Bottom Row: Results & Workspace (100%) */}
        <CurationWorkspace lang={lang} curationData={curationData} userId={userId} />
      </main>
    </div>
  )
}

export default App
