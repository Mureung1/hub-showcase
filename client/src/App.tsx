import { useState, useEffect } from 'react'
import './App.css'
import GlobalHeader from './components/GlobalHeader'
import ProfileBoard from './components/ProfileBoard'
import CurationWorkspace from './components/CurationWorkspace'
import MyLibrary from './components/MyLibrary'
import { CurationData, LibraryItem } from './types'
import { useProfileSession } from './hooks/useProfileSession'
import { useAuth } from './context/AuthContext'

function App() {
  const [lang, setLang] = useState<'KO' | 'EN'>(() => (localStorage.getItem('scholar_lang') as 'KO' | 'EN') || 'KO');
  const [query, setQuery] = useState('');
  const [curationData, setCurationData] = useState<CurationData | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    localStorage.setItem('scholar_lang', lang);
  }, [lang]);
  
  // Custom Hook: Container A 연구 프로필 로컬스토리지 영속화 및 Auth 세션 관리
  const {
    userId,
    major,
    setMajor,
    channels,
    toggleChannel,
    keywords,
    addKeyword,
    removeKeyword
  } = useProfileSession();

  const [savedPapers, setSavedPapers] = useState<LibraryItem[]>([])
  const [currentView, setCurrentView] = useState<'dashboard' | 'library'>('dashboard')

  // 초기 렌더링 시 내 서재 데이터 로드 (Path Variable & JWT Header 사용)
  useEffect(() => {
    if (!userId) return;
    
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    fetch(`${baseUrl}/api/library/${userId}`, { headers })
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
  }, [userId, session]);

  // 서재 논문 삭제 처리 핸들러 (Lifting Up)
  const handleRemovePaper = async (paperId: string): Promise<void> => {
    const confirmMessage = lang === 'KO' 
      ? '해당 논문을 서재에서 제거하시겠습니까?' 
      : 'Are you sure you want to remove this paper from your library?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${baseUrl}/api/library/${userId}/${paperId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        setSavedPapers(prev => prev.filter(item => item.paperId !== paperId));
        alert(lang === 'KO' ? '서재에서 삭제되었습니다.' : 'Removed from library.');
      } else {
        alert(lang === 'KO' ? '삭제에 실패했습니다.' : 'Failed to remove paper.');
      }
    } catch (error) {
      console.error('❌ Remove paper error:', error);
      alert(lang === 'KO' ? '삭제에 실패했습니다.' : 'Failed to remove paper.');
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
          <ProfileBoard 
            lang={lang} 
            setCurationData={setCurationData} 
            major={major}
            setMajor={setMajor}
            channels={channels}
            toggleChannel={toggleChannel}
            keywords={keywords}
            addKeyword={addKeyword}
            removeKeyword={removeKeyword}
            query={query}
            setQuery={setQuery}
          />
          
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
        <MyLibrary lang={lang} savedPapers={savedPapers} handleRemovePaper={handleRemovePaper} />
      )}
    </div>
  )
}

export default App
