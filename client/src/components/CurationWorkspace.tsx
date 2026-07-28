import React, { useState, useEffect } from 'react';
import { CurationData, Paper, LibraryItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface CurationWorkspaceProps {
  lang: 'KO' | 'EN';
  curationData: CurationData | null;
  userId: string;
  savedPapers: LibraryItem[];
  setSavedPapers: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
  handleRemovePaper: (paperId: string) => Promise<void>;
}

function CurationWorkspace({ lang, curationData, userId, savedPapers, setSavedPapers, handleRemovePaper }: CurationWorkspaceProps) {
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const { session } = useAuth();

  useEffect(() => {
    if (curationData?.papers && curationData.papers.length > 0) {
      setSelectedPaper(curationData.papers[0]);
    } else {
      setSelectedPaper(null);
    }
  }, [curationData]);

  const handleSavePaper = async (paper: Paper): Promise<void> => {
    try {
      // 1. 비로그인 유저 원천 차단 (FE Guard)
      if (!session || !session.access_token) {
        alert('내 서재에 보관하려면 로그인이 필요합니다.');
        return;
      }

      if (savingIds.includes(paper.paperId)) return;
      
      // 이미 저장된 논문인지 중복 검사
      if (savedPapers.some(item => item.paperId === paper.paperId)) {
        alert('이미 서재에 보관된 논문입니다.');
        return;
      }

      setSavingIds(prev => [...prev, paper.paperId]);

      // DB 인서트 에러 방지를 위해 insights 필드를 제외하고 스키마에 필요한 필드만 Payload 구성
      const { paperId, title, authors, channel, year, matchScore, url } = paper;
      const formattedAuthors = Array.isArray(authors) ? authors.join(', ') : authors;
      const paperPayload = { paperId, title, authors: formattedAuthors, channel, year, matchScore, userId, url: url || '' };

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${baseUrl}/api/library`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ paper: paperPayload })
      });

      if (response.ok) {
        const resJson = await response.json() as { status: string; data: LibraryItem };
        if (resJson.status === 'success') {
          setSavedPapers(prev => [...prev, resJson.data]);
          alert('서재에 안전하게 보관되었습니다!');
        }
      } else {
        alert('보관에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Save paper error:', error);
      alert('보관에 실패했습니다.');
    } finally {
      setSavingIds(prev => prev.filter(id => id !== paper.paperId));
    }
  };

  if (!curationData) {
    return (
      <section id="container-c" className="bento-card container-c placeholder-container">
        <div className="placeholder-content">
          <div className="placeholder-icon">🔍</div>
          <p className="placeholder-desc">
            원하시는 연구 키워드를 입력하고 큐레이션을 시작해 주세요.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="container-c" className="bento-card container-c">
      
      {/* C-Left: 큐레이션 결과 리스트 뷰 (45% 폭) */}
      <div className="container-c-left">
        <div className="sub-card-header">
          <h2 className="card-title">Container C (좌측): 큐레이션 결과</h2>
        </div>
        <div className="sub-card-content scroll-y">
          <p className="placeholder-text">매칭 스코어(%) 기준 정렬 논문 목록</p>
          
          {!curationData.papers || curationData.papers.length === 0 ? (
            <p className="empty-result">검색 결과가 없습니다.</p>
          ) : (
            curationData.papers.map((paper) => (
              <div 
                key={paper.paperId} 
                className={`paper-card ${paper.matchScore >= 90 ? 'high-match' : 'medium-match'} ${selectedPaper?.paperId === paper.paperId ? 'active' : ''}`}
                onClick={() => setSelectedPaper(paper)}
              >
                <div className={`ribbon-badge ribbon-badge-inline ${paper.matchScore >= 90 ? '' : 'yellow'}`}>
                  {paper.matchScore}% Match
                </div>
                <h3 className="paper-title">{paper.title}</h3>
                <p className="paper-authors">{Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}</p>
                <div className="paper-meta paper-meta-bottom">
                  <span className="paper-channel">{paper.channel}</span> • <span className="paper-year">{paper.year}</span>
                </div>
                
                {/* 보관 및 원문보기 버튼 액션 그룹 */}
                <div className="card-action-group">
                  <button 
                    className="action-btn-primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSavePaper(paper);
                    }}
                    disabled={savingIds.includes(paper.paperId)}
                  >
                    {savingIds.includes(paper.paperId) ? '💾 보관 중...' : '💾 내 서재 보관'}
                  </button>
                  {paper.url && (
                    <a 
                      href={paper.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="action-btn-secondary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📖 원문 보기
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* C-Right: 3줄 핵심 인사이트 보드 및 내 서재 보관함 (55% 폭) */}
      <div className="container-c-right">
        <div className="sub-card-header">
          <h2 className="card-title">Container C (우측): 데일리 인사이트 & 서재</h2>
        </div>
        <div className="sub-card-content scroll-y">
          
          {/* 3줄 요약 인사이트 패널 */}
          {selectedPaper ? (
            <div className="insight-panel">
              <h4 className="panel-subtitle">💡 에이전트 3줄 핵심 요약: "{selectedPaper.title}"</h4>
              
              <div className="insight-item">
                <div className="number-circle">1</div>
                <div className="insight-text">
                  <strong>연구 배경 및 한계 원인 (Research Background & Limitations):</strong> {selectedPaper.insights?.background || selectedPaper.reasoning}
                </div>
              </div>

              <div className="insight-item">
                <div className="number-circle">2</div>
                <div className="insight-text">
                  <strong>제안하는 핵심 방법론 (Proposed Core Method):</strong> {selectedPaper.insights?.coreMethod || selectedPaper.reasoning}
                </div>
              </div>

              <div className="insight-item">
                <div className="number-circle">3</div>
                <div className="insight-text">
                  <strong>구체적 개선 결과 및 수치 (Specific Results & Metrics):</strong> {selectedPaper.insights?.quantitativeResult || selectedPaper.reasoning}
                </div>
              </div>
              
              <div className="insight-action-group">
                <button 
                  id="add-to-library-btn" 
                  className="action-btn-primary"
                  onClick={() => handleSavePaper(selectedPaper)}
                  disabled={savingIds.includes(selectedPaper.paperId)}
                >
                  {savingIds.includes(selectedPaper.paperId) ? '💾 보관 중...' : '💾 내 서재 보관'}
                </button>
                {selectedPaper.url && (
                  <a 
                    href={selectedPaper.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="action-btn-secondary"
                  >
                    📖 원문 보기
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="insight-panel insight-placeholder">
              <p>원하는 논문을 선택하시면 에이전트 분석 요약이 제공됩니다.</p>
            </div>
          )}

          {/* 내 서재 보관함 라이브러리 */}
          <div className="library-panel">
            <h4 className="panel-subtitle">📚 내 서재 보관함 (My Library)</h4>
            <ul className="library-list">
              {savedPapers.length === 0 ? (
                <p className="empty-result library-empty-text">보관된 논문이 없습니다.</p>
              ) : (
                savedPapers.map((item) => (
                  <li key={item.paperId} className="library-item">
                    <span className="library-paper-title text-truncate" title={item.title}>
                      {item.title}
                    </span>
                    <div className="library-btn-group">
                      {item.url && (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="action-btn-secondary-sm"
                        >
                          📖 원문
                        </a>
                      )}
                      <button className="remove-btn" onClick={() => handleRemovePaper(item.paperId)}>
                        제거
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

        </div>
      </div>

    </section>
  );
}

export default CurationWorkspace;
