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
      if (savingIds.includes(paper.paperId)) return;
      
      // 이미 저장된 논문인지 중복 검사
      if (savedPapers.some(item => item.paperId === paper.paperId)) {
        alert('이미 서재에 보관된 논문입니다.');
        return;
      }

      setSavingIds(prev => [...prev, paper.paperId]);

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
        <div className="sub-card-content">
          <p className="placeholder-text">매칭 스코어(%) 기준 정렬 논문 목록</p>
          
          {!curationData.papers || curationData.papers.length === 0 ? (
            <p className="empty-result">검색 결과가 없습니다.</p>
          ) : (
            curationData.papers.map((paper) => (
              <div 
                key={paper.paperId} 
                className={`paper-card ${paper.matchScore >= 90 ? 'high-match' : 'medium-match'} ${selectedPaper?.paperId === paper.paperId ? 'active' : ''}`}
                onClick={() => setSelectedPaper(paper)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              >
                <div className="paper-card-header">
                  <span className="match-badge">{paper.matchScore}% Match</span>
                  <span className="paper-year">{paper.year}</span>
                </div>
                <h3 className="paper-card-title">{paper.title}</h3>
                <p className="paper-card-authors">{Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span className="paper-channel-tag">{paper.channel}</span>
                  <button 
                    className="save-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSavePaper(paper);
                    }}
                    disabled={savingIds.includes(paper.paperId)}
                  >
                    {savingIds.includes(paper.paperId) ? '보관 중...' : savedPapers.some(item => item.paperId === paper.paperId) ? '보관됨' : '📌 내 서재 보관'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* C-Right: 상세 3줄 인사이트 뷰 (55% 폭) */}
      <div className="container-c-right">
        <div className="sub-card-header">
          <h2 className="card-title">Container C (우측): AI 3줄 인사이트</h2>
        </div>
        <div className="sub-card-content">
          {!selectedPaper ? (
            <div className="placeholder-content">
              <p className="placeholder-desc">좌측에서 논문을 선택하면 3줄 핵심 인사이트가 표시됩니다.</p>
            </div>
          ) : (
            <div className="paper-detail-view">
              <div className="detail-header">
                <h3>{selectedPaper.title}</h3>
                <p className="detail-meta">
                  저자: {Array.isArray(selectedPaper.authors) ? selectedPaper.authors.join(', ') : selectedPaper.authors} | 채널: {selectedPaper.channel} ({selectedPaper.year})
                </p>
                {selectedPaper.url && (
                  <a href={selectedPaper.url} target="_blank" rel="noopener noreferrer" className="paper-link-btn">
                    🔗 원문 논문 보기 (Open Access)
                  </a>
                )}
              </div>

              {/* OVG 3대 학술 평가 바 */}
              <div className="ovg-section">
                <h4>OVG 3대 학술 평가</h4>
                <div className="ovg-bars">
                  <div className="ovg-bar-item">
                    <span>독창성 (Originality): {selectedPaper.ovgBreakdown?.originality || 90}%</span>
                    <div className="bar-bg"><div className="bar-fill" style={{ width: `${selectedPaper.ovgBreakdown?.originality || 90}%` }}></div></div>
                  </div>
                  <div className="ovg-bar-item">
                    <span>타당성 (Validity): {selectedPaper.ovgBreakdown?.validity || 90}%</span>
                    <div className="bar-bg"><div className="bar-fill" style={{ width: `${selectedPaper.ovgBreakdown?.validity || 90}%` }}></div></div>
                  </div>
                  <div className="ovg-bar-item">
                    <span>일반화 가능성 (Generalizability): {selectedPaper.ovgBreakdown?.generalizability || 90}%</span>
                    <div className="bar-bg"><div className="bar-fill" style={{ width: `${selectedPaper.ovgBreakdown?.generalizability || 90}%` }}></div></div>
                  </div>
                </div>
              </div>

              {/* XAI 선별 근거 및 3대 정형화 구획 인사이트 */}
              <div className="insights-section">
                <div className="reasoning-box">
                  <strong>💡 에이전트 선별 근거:</strong>
                  <p>{selectedPaper.reasoning}</p>
                </div>

                <div className="insight-blocks">
                  <div className="insight-block background">
                    <span className="block-tag">📌 연구 배경</span>
                    <p>{selectedPaper.insights?.background}</p>
                  </div>
                  <div className="insight-block method">
                    <span className="block-tag">⚡ 핵심 방법론</span>
                    <p>{selectedPaper.insights?.coreMethod}</p>
                  </div>
                  <div className="insight-block result">
                    <span className="block-tag">📈 개선 결과</span>
                    <p>{selectedPaper.insights?.quantitativeResult}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CurationWorkspace;
