import React, { useState } from 'react';
import { CurationData } from '../types';

interface ProfileBoardProps {
  lang: 'KO' | 'EN';
  setCurationData: React.Dispatch<React.SetStateAction<CurationData | null>>;
  major: string;
  setMajor: (major: string) => void;
  channels: string[];
  toggleChannel: (channel: string) => void;
  keywords: string[];
  addKeyword: (keyword: string) => void;
  removeKeyword: (index: number) => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}

const AVAILABLE_CHANNELS = [
  'arXiv (Computer Science)',
  'IEEE Xplore',
  'ACM Digital Library',
  'Nature / Science Direct',
  'PubMed'
];

function ProfileBoard({ 
  lang, 
  setCurationData, 
  major, 
  setMajor, 
  channels, 
  toggleChannel, 
  keywords, 
  addKeyword, 
  removeKeyword,
  query,
  setQuery
}: ProfileBoardProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [isCurating, setIsCurating] = useState(false);
  const [isEditingMajor, setIsEditingMajor] = useState(false);
  const [tempMajor, setTempMajor] = useState(major);

  const handleSaveMajor = () => {
    if (tempMajor.trim()) {
      setMajor(tempMajor.trim());
    }
    setIsEditingMajor(false);
  };

  const handleAddKeywordSubmit = () => {
    if (newKeyword.trim()) {
      addKeyword(newKeyword.trim());
      setNewKeyword('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddKeywordSubmit();
    }
  };

  const handleStartCuration = () => {
    if (!query.trim()) {
      alert(lang === 'KO' ? '큐레이션을 위한 연구 관심사 또는 질의를 입력해 주세요.' : 'Please enter your research query for curation.');
      return;
    }

    setIsCurating(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    fetch(`${baseUrl}/api/curate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        major,
        channels,
        keywords,
        query,
        lang
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('큐레이션 API 요청 실패');
        }
        return res.json() as Promise<{ status: string; data: CurationData }>;
      })
      .then((data) => {
        if (data.status === 'success' && data.data) {
          setCurationData(data.data);
        } else {
          alert(lang === 'KO' ? '큐레이션 데이터를 불러오는데 실패했습니다.' : 'Failed to fetch curation data.');
        }
      })
      .catch((err) => {
        console.error('❌ Curation error:', err);
        alert(lang === 'KO' ? '큐레이션 실행 중 에러가 발생했습니다. 백엔드 서버 상태를 확인해 주세요.' : 'An error occurred during curation. Please check backend status.');
      })
      .finally(() => {
        setIsCurating(false);
      });
  };

  return (
    <>
      {/* Container A: 연구 프로필 (Top Row - Left, Width 75%) */}
      <section id="container-a" className="bento-card container-a">
        <div className="card-header">
          <h2 className="card-title">{lang === 'KO' ? 'Container A: 연구 프로필' : 'Container A: Research Profile'}</h2>
        </div>
        <div className="card-content">
          <p className="placeholder-text">{lang === 'KO' ? '연구 프로필 및 학술 채널/관심 키워드 관리' : 'Manage research profile & academic channels'}</p>
          
          <div className="profile-widget">
            <div className="widget-info-row profile-flex-row">
              <span className="info-label info-label-bold">{lang === 'KO' ? '소속 전공:' : 'Department/Major:'}</span>
              {isEditingMajor ? (
                <div className="profile-edit-row">
                  <input 
                    type="text" 
                    className="keyword-input keyword-input-sm" 
                    value={tempMajor}
                    onChange={(e) => setTempMajor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMajor(); }}
                  />
                  <button className="add-btn add-btn-sm" onClick={handleSaveMajor}>{lang === 'KO' ? '저장' : 'Save'}</button>
                </div>
              ) : (
                <span className="info-value info-value-clickable" onClick={() => { setTempMajor(major); setIsEditingMajor(true); }} title={lang === 'KO' ? '클릭하여 수정' : 'Click to edit'}>
                  {major} <span className="edit-icon">✏️</span>
                </span>
              )}
            </div>
            
            <div className="channel-toggles">
              <span className="section-label section-label-bold">{lang === 'KO' ? '학술 채널 토글:' : 'Academic Channels:'}</span>
              <div className="button-group">
                {AVAILABLE_CHANNELS.map((ch) => {
                  const isActive = channels.includes(ch);
                  return (
                    <button 
                      key={ch} 
                      className={`channel-toggle-btn ${isActive ? 'active' : ''}`}
                      onClick={() => toggleChannel(ch)}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="keyword-section">
              <span className="section-label section-label-bold">{lang === 'KO' ? '관심 키워드 뱃지 풀:' : 'Interest Keywords:'}</span>
              <div className="keyword-badges">
                {keywords.map((kw, idx) => (
                  <span key={kw} className="badge profile-badge">
                    {kw} 
                    <span 
                      className="delete-x badge-delete-x" 
                      onClick={() => removeKeyword(idx)}
                      role="button"
                      tabIndex={0}
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
              <div className="keyword-input-form">
                <input 
                  type="text" 
                  id="keyword-input-field"
                  placeholder={lang === 'KO' ? '새로운 연구 키워드 입력...' : 'Enter new keyword...'} 
                  className="keyword-input" 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button 
                  id="add-keyword-btn" 
                  className="add-btn"
                  onClick={handleAddKeywordSubmit}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Container B: 큐레이션 보드 (Top Row - Right, Width 25%) */}
      <section id="container-b" className="bento-card container-b">
        <div className="card-header">
          <h2 className="card-title">{lang === 'KO' ? 'Container B: 큐레이션 보드' : 'Container B: Curation Board'}</h2>
        </div>
        <div className="card-content">
          <p className="placeholder-text">{lang === 'KO' ? '자연어 쿼리 전달 및 큐레이션 구동' : 'Input query to trigger agentic curation'}</p>
          
          <div className="query-widget">
            <textarea 
              id="query-input-area"
              className="query-textarea" 
              placeholder={lang === 'KO' ? '최신 LLM Agent의 멀티모달 추론 능력 향상 방안에 대한 논문을 찾아줘.' : 'Search for papers on improving multimodal reasoning capabilities of LLM Agents.'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            
            <button 
              id="start-curation-btn" 
              className="master-action-btn"
              onClick={handleStartCuration}
              disabled={isCurating}
            >
              {isCurating 
                ? (lang === 'KO' ? '에이전트 분석 중...' : 'Analyzing...') 
                : (lang === 'KO' ? '큐레이션 시작' : 'Start Curation')}
            </button>
            
            {isCurating && (
              <div className="analysis-status">
                <div className="status-label">{lang === 'KO' ? '에이전트 실시간 분석 대기 중 (30%)' : 'Agent analyzing in real-time (30%)'}</div>
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default ProfileBoard;
