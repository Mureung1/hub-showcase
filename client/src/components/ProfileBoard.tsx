import React, { useState } from 'react';
import { CurationData, CurationResponse } from '../types';

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
}

const AVAILABLE_CHANNELS = ['arXiv', 'IEEE', 'NeurIPS', 'CVPR', 'ACM', 'Springer'];

function ProfileBoard({
  lang,
  setCurationData,
  major,
  setMajor,
  channels,
  toggleChannel,
  keywords,
  addKeyword,
  removeKeyword
}: ProfileBoardProps) {
  const [newKeyword, setNewKeyword] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [isCurating, setIsCurating] = useState<boolean>(false);
  const [isEditingMajor, setIsEditingMajor] = useState<boolean>(false);
  const [tempMajor, setTempMajor] = useState<string>(major);

  const handleAddKeywordSubmit = (): void => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    addKeyword(trimmed);
    setNewKeyword('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleAddKeywordSubmit();
    }
  };

  const handleSaveMajor = (): void => {
    const trimmed = tempMajor.trim();
    if (trimmed) {
      setMajor(trimmed);
    }
    setIsEditingMajor(false);
  };

  const handleStartCuration = (): void => {
    if (query.trim() === '') return;
    setIsCurating(true);
    console.log("🚀 큐레이션 요청 쿼리:", query);
    
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    fetch(`${baseUrl}/api/curate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        major: major,          // 훅에서 보관 중인 동적 소속 전공
        keywords: keywords,    // UI 뱃지 풀 상태 반영
        query: query 
      })
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorJson = await response.json().catch(() => null);
          const fallbackMsg = '학술 데이터베이스 API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';
          throw new Error(errorJson?.message || fallbackMsg);
        }
        return response.json() as Promise<CurationResponse>;
      })
      .then(responseJson => {
        console.log("✅ 큐레이션 성공:", responseJson);
        setCurationData(responseJson.data);
      })
      .catch(error => {
        console.error("❌ 큐레이션 에러:", error);
        const displayMsg = error?.message || '학술 데이터베이스 API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';
        alert(displayMsg);
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
          <h2 className="card-title">Container A: 연구 프로필</h2>
        </div>
        <div className="card-content">
          <p className="placeholder-text">연구 프로필 및 학술 채널/관심 키워드 관리</p>
          
          <div className="profile-widget">
            <div className="widget-info-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="info-label" style={{ fontWeight: 600 }}>소속 전공:</span>
              {isEditingMajor ? (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="keyword-input" 
                    style={{ padding: '2px 8px', fontSize: '12px' }}
                    value={tempMajor}
                    onChange={(e) => setTempMajor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMajor(); }}
                  />
                  <button className="add-btn" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleSaveMajor}>저장</button>
                </div>
              ) : (
                <span className="info-value" style={{ cursor: 'pointer' }} onClick={() => { setTempMajor(major); setIsEditingMajor(true); }} title="클릭하여 수정">
                  {major} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>✏️</span>
                </span>
              )}
            </div>
            
            <div className="channel-toggles" style={{ marginTop: '12px' }}>
              <span className="section-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>학술 채널 토글:</span>
              <div className="button-group" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {AVAILABLE_CHANNELS.map((ch) => {
                  const isActive = channels.includes(ch);
                  return (
                    <button 
                      key={ch} 
                      className={`toggle-btn ${isActive ? 'active' : ''}`}
                      onClick={() => toggleChannel(ch)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: isActive ? 'var(--accent-cyan, #00f2fe)' : 'transparent',
                        color: isActive ? '#000' : 'var(--text-color)',
                        cursor: 'pointer'
                      }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="keyword-section" style={{ marginTop: '14px' }}>
              <span className="section-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>관심 키워드 뱃지 풀:</span>
              <div className="keyword-badges" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {keywords.map((kw, idx) => (
                  <span key={kw} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', backgroundColor: 'rgba(0, 242, 254, 0.1)', border: '1px solid var(--accent-cyan, #00f2fe)', borderRadius: '12px' }}>
                    {kw} 
                    <span 
                      className="delete-x" 
                      onClick={() => removeKeyword(idx)}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer', marginLeft: '4px', color: '#ff4d4f', fontWeight: 'bold' }}
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
              <div className="keyword-input-form" style={{ display: 'flex', gap: '6px' }}>
                <input 
                  type="text" 
                  id="keyword-input-field"
                  placeholder="새로운 연구 키워드 입력..." 
                  className="keyword-input" 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                />
                <button 
                  id="add-keyword-btn" 
                  className="add-btn"
                  onClick={handleAddKeywordSubmit}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
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
