import { useState, useEffect } from 'react'
import './App.css'
import GlobalHeader from './components/GlobalHeader'
import ProfileBoard from './components/ProfileBoard'
import CurationWorkspace from './components/CurationWorkspace'
import MyLibrary from './components/MyLibrary'
import { CurationData, LibraryItem } from './types'

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

  const [savedPapers, setSavedPapers] = useState<LibraryItem[]>([])
  const [currentView, setCurrentView] = useState<'dashboard' | 'library'>('dashboard')

  // 초기 렌더링 시 내 서재 데이터 로드 (Path Variable 사용)
  useEffect(() => {
    if (!userId) return;
    
    fetch(`http://localhost:5000/api/library/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch library');
        return res.json() as Promise<{ status: string; data: LibraryItem[] }>;
      })
      .then(resJson => {
        if (resJson.status === 'success') {
          setSavedPapers(resJson.data);
        }
      })
      .catch(err => console.error('❌ Fetch library error:', err));
  }, [userId]);

  // 서재 논문 삭제 처리 핸들러 (Lifting Up)
  const handleRemovePaper = async (paperId: string): Promise<void> => {
    try {
      const response = await fetch(`http://localhost:5000/api/library/${userId}/${paperId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSavedPapers(prev => prev.filter(item => item.paperId !== paperId));
        alert('서재에서 삭제되었습니다.');
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Remove paper error:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="app-container">
      {/* A. Global Header */}
      <GlobalHeader lang={lang} setLang={setLang} currentView={currentView} setCurrentView={setCurrentView} />

      {/* B. 2x2 Bento Grid Area or My Library page */}
      {currentView === 'dashboard' ? (
        <main className="bento-grid">
          {/* Top Row: Profile (75%) & Curation Board (25%) */}
          <ProfileBoard lang={lang} setCurationData={setCurationData} />
          
          {/* Bottom Row: Results & Workspace (100%) */}
          <CurationWorkspace 
            lang={lang} 
            curationData={curationData} 
            userId={userId} 
            savedPapers={savedPapers}
            setSavedPapers={setSavedPapers}
            handleRemovePaper={handleRemovePaper}
          />
        </main>
      ) : (
        <MyLibrary savedPapers={savedPapers} handleRemovePaper={handleRemovePaper} />
      )}
    </div>
  )
}

export default App
