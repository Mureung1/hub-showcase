import React, { useState, useEffect } from 'react';
import { CurationData, Paper, LibraryItem } from '../types';

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

      // DB 인서트 에러 방지를 위해 insights 필드를 제외하고 스키마에 필요한 필드만 Payload 구성 (userId 병합, authors 배열 안전 변환, url 연동)
      const { paperId, title, authors, channel, year, matchScore, url } = paper;
      const formattedAuthors = Array.isArray(authors) ? authors.join(', ') : authors;
      const paperPayload = { paperId, title, authors: formattedAuthors, channel, year, matchScore, userId, url: url || '' };

      const response = await fetch('http://localhost:5000/api/library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paper: paperPayload })
      });

      if (response.ok) {
        const resJson = await response.json() as { status: string; data: LibraryItem };
        if (resJson.status === 'success') {
          // 시니어 피드백: 전체 목록 GET 대신 응답으로 받아온 DTO 객체를 append
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
                <div 
                  className={`ribbon-badge ${paper.matchScore >= 90 ? '' : 'yellow'}`}
                  style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', display: 'inline-block', marginBottom: '12px', alignSelf: 'flex-start', borderRadius: '4px' }}
                >
                  {paper.matchScore}% Match
                </div>
                <h3 className="paper-title">{paper.title}</h3>
                <p className="paper-authors">{Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}</p>
                <div className="paper-meta" style={{ marginTop: 'auto' }}>
                  <span className="paper-channel">{paper.channel}</span> • <span className="paper-year">{paper.year}</span>
                </div>
                
                {/* 보관 및 원문보기 버튼 액션 그룹 (50:50 대칭 세로 높이 동기화 및 CSS 강제 리셋) */}
                <div className="card-action-group" style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'stretch' }}>
                  <button 
                    className="archive-btn save-paper-btn" 
                    onClick={(e) => {
                      e.stopPropagation(); // 카드 클릭 이벤트 전파 차단
                      handleSavePaper(paper);
                    }}
                    disabled={savingIds.includes(paper.paperId)}
                    style={{ flex: 1, height: 'auto', margin: 0, alignSelf: 'stretch', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap', boxSizing: 'border-box', border: '1px solid transparent' }}
                  >
                    {savingIds.includes(paper.paperId) ? '💾 보관 중...' : '💾 내 서재 보관'}
                  </button>
                  {paper.url && (
                    <a 
                      href={paper.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="archive-btn"
                      onClick={(e) => e.stopPropagation()}
                      style={{ flex: 1, height: 'auto', margin: 0, alignSelf: 'stretch', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap', boxSizing: 'border-box', textDecoration: 'none', color: '#4dabf7', borderColor: '#4dabf7', backgroundColor: 'rgba(77, 171, 247, 0.1)', border: '1px solid #4dabf7', borderRadius: '4px' }}
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
                  <strong>연구 배경 및 한계 원인 (Research Background & Limitations):</strong> {selectedPaper.insights.background}
                </div>
              </div>

              <div className="insight-item">
                <div className="number-circle">2</div>
                <div className="insight-text">
                  <strong>제안하는 핵심 방법론 (Proposed Core Method):</strong> {selectedPaper.insights.coreMethod}
                </div>
              </div>

              <div className="insight-item">
                <div className="number-circle">3</div>
                <div className="insight-text">
                  <strong>구체적 개선 결과 및 수치 (Specific Results & Metrics):</strong> {selectedPaper.insights.quantitativeResult}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'stretch' }}>
                <button 
                  id="add-to-library-btn" 
                  className="archive-btn"
                  onClick={() => handleSavePaper(selectedPaper)}
                  disabled={savingIds.includes(selectedPaper.paperId)}
                  style={{ flex: 1, height: 'auto', margin: 0, alignSelf: 'stretch', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap', boxSizing: 'border-box', border: '1px solid transparent' }}
                >
                  {savingIds.includes(selectedPaper.paperId) ? '💾 보관 중...' : '💾 내 서재 보관'}
                </button>
                {selectedPaper.url && (
                  <a 
                    href={selectedPaper.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="archive-btn"
                    style={{ flex: 1, height: 'auto', margin: 0, alignSelf: 'stretch', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap', boxSizing: 'border-box', textDecoration: 'none', color: '#4dabf7', borderColor: '#4dabf7', backgroundColor: 'rgba(77, 171, 247, 0.1)', border: '1px solid #4dabf7', borderRadius: '4px' }}
                  >
                    📖 원문 보기
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="insight-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>원하는 논문을 선택하시면 에이전트 분석 요약이 제공됩니다.</p>
            </div>
          )}

          {/* 내 서재 보관함 라이브러리 */}
          <div className="library-panel">
            <h4 className="panel-subtitle">📚 내 서재 보관함 (My Library)</h4>
            <ul className="library-list">
              {savedPapers.length === 0 ? (
                <p className="empty-result" style={{ fontSize: '11px' }}>보관된 논문이 없습니다.</p>
              ) : (
                savedPapers.map((item) => (
                  <li key={item.paperId} className="library-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="library-paper-title" title={item.title} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                      {item.title}
                    </span>
                    <div className="library-btn-group" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {item.url && (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="remove-btn"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#4dabf7', borderColor: '#4dabf7', backgroundColor: 'rgba(77, 171, 247, 0.1)', border: '1px solid #4dabf7', whiteSpace: 'nowrap' }}
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
