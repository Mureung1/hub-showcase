import React, { useState } from 'react';
import { CurationData, CurationResponse } from '../types';

interface ProfileBoardProps {
  lang: 'KO' | 'EN';
  setCurationData: React.Dispatch<React.SetStateAction<CurationData | null>>;
}

function ProfileBoard({ lang, setCurationData }: ProfileBoardProps) {
  // A. States
  const [keywords, setKeywords] = useState<string[]>([
    'Natural Language Processing',
    'Retrieval-Augmented Generation',
    'AI Agents'
  ]);
  const [newKeyword, setNewKeyword] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [isCurating, setIsCurating] = useState<boolean>(false);

  // B. Handlers
  const handleAddKeyword = (): void => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    
    // Prevent duplicate keywords
    if (!keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
    setNewKeyword('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleAddKeyword();
    }
  };

  const handleRemoveKeyword = (indexToRemove: number): void => {
    setKeywords(keywords.filter((_, idx) => idx !== indexToRemove));
  };

  const handleStartCuration = (): void => {
    if (query.trim() === '') return;
    setIsCurating(true);
    console.log("🚀 큐레이션 요청 쿼리:", query);
    
    fetch('http://localhost:5000/api/curate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        major: 'computer science AI', // 명시적 전달
        keywords: keywords,           // UI의 뱃지 상태 배열을 Payload에 탑재
        query: query 
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json() as Promise<CurationResponse>;
      })
      .then(responseJson => {
        console.log("✅ 큐레이션 성공:", responseJson);
        setCurationData(responseJson.data);
        setIsCurating(false);
      })
      .catch(error => {
        console.error("❌ 큐레이션 에러:", error);
        setIsCurating(false);
      });
  };

  return (
    <>
      {/* Container A: 연구 프로필 (Top Row - Left, Width 75%) */}
      <section id="container-a" className="bento-card container-a">
        <div className="card-header">
          <h2 className="card-title">Container A: 연구 프로필</h2>
        </div>
        <div className="card-content">
          <p className="placeholder-text">연구 프로필 및 학술 채널/관심 키워드 관리</p>
          
          <div className="profile-widget">
            <div className="widget-info-row">
              <span className="info-label">소속 전공:</span>
              <span className="info-value">컴퓨터공학 / AI 융합 연구실</span>
            </div>
            
            <div className="channel-toggles">
              <span className="section-label">학술 채널 토글:</span>
              <div className="button-group">
                <button className="toggle-btn active">arXiv</button>
                <button className="toggle-btn active">IEEE</button>
                <button className="toggle-btn">NeurIPS</button>
                <button className="toggle-btn">CVPR</button>
              </div>
            </div>
            
            <div className="keyword-section">
              <span className="section-label">관심 키워드 뱃지 풀:</span>
              <div className="keyword-badges">
                {keywords.map((kw, idx) => (
                  <span key={kw} className="badge">
                    {kw} 
                    <span 
                      className="delete-x" 
                      onClick={() => handleRemoveKeyword(idx)}
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
                  placeholder="새로운 연구 키워드 입력..." 
                  className="keyword-input" 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button 
                  id="add-keyword-btn" 
                  className="add-btn"
                  onClick={handleAddKeyword}
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
          <h2 className="card-title">Container B: 큐레이션 보드</h2>
        </div>
        <div className="card-content">
          <p className="placeholder-text">자연어 쿼리 전달 및 큐레이션 구동</p>
          
          <div className="query-widget">
            <textarea 
              id="query-input-area"
              className="query-textarea" 
              placeholder="최신 LLM Agent의 멀티모달 추론 능력 향상 방안에 대한 논문을 찾아줘."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            
            <button 
              id="start-curation-btn" 
              className="master-action-btn"
              onClick={handleStartCuration}
              disabled={isCurating}
            >
              {isCurating ? '에이전트 분석 중...' : '큐레이션 시작'}
            </button>
            
            {isCurating && (
              <div className="analysis-status">
                <div className="status-label">에이전트 실시간 분석 대기 중 (30%)</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '30%' }}></div>
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
