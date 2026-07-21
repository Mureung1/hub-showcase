import React, { useState, useEffect } from 'react';
import { CurationData, Paper, LibraryItem } from '../types';

interface CurationWorkspaceProps {
  lang: 'KO' | 'EN';
  curationData: CurationData | null;
  userId: string;
  savedPapers: LibraryItem[];
  setSavedPapers: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
}

function CurationWorkspace({ lang, curationData, userId, savedPapers, setSavedPapers }: CurationWorkspaceProps) {
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  useEffect(() => {
    if (curationData?.papers && curationData.papers.length > 0) {
      setSelectedPaper(curationData.papers[0]);
    } else {
      setSelectedPaper(null);
    }
  }, [curationData]);

  const handleSavePaper = async (paper: Paper): Promise<void> => {
    try {
      // 이미 저장된 논문인지 중복 검사
      if (savedPapers.some(item => item.paperId === paper.id)) {
        alert('이미 서재에 보관된 논문입니다.');
        return;
      }

      // DB 인서트 에러 방지를 위해 insights 필드를 제외하고 스키마에 필요한 필드만 Payload 구성 (userId 병합)
      const { id, title, authors, channel, year, matchScore } = paper;
      const paperPayload = { id, title, authors, channel, year, matchScore, userId };

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
    }
  };

  const handleRemovePaper = async (paperId: string): Promise<void> => {
    try {
      // 시니어 피드백: DELETE /api/library/:userId/:paperId RESTful 경로 변수 사용
      const response = await fetch(`http://localhost:5000/api/library/${userId}/${paperId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // 로컬 상태 즉시 갱신
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
                key={paper.id} 
                className={`paper-card ${paper.matchScore >= 90 ? 'high-match' : 'medium-match'} ${selectedPaper?.id === paper.id ? 'active' : ''}`}
                onClick={() => setSelectedPaper(paper)}
                style={{ cursor: 'pointer' }}
              >
                <div className={`ribbon-badge ${paper.matchScore >= 90 ? '' : 'yellow'}`}>
                  {paper.matchScore}% Match
                </div>
                <h3 className="paper-title">{paper.title}</h3>
                <p className="paper-authors">{paper.authors}</p>
                <div className="paper-meta">
                  <span className="paper-channel">{paper.channel}</span> • <span className="paper-year">{paper.year}</span>
                </div>
                
                {/* 보관 버튼 추가 */}
                <button 
                  className="archive-btn save-paper-btn" 
                  onClick={(e) => {
                    e.stopPropagation(); // 카드 클릭 이벤트 전파 차단
                    handleSavePaper(paper);
                  }}
                  style={{ marginTop: '10px', padding: '6px 12px', fontSize: '11px' }}
                >
                  내 서재 보관
                </button>
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
              
              <button 
                id="add-to-library-btn" 
                className="archive-btn"
                onClick={() => handleSavePaper(selectedPaper)}
              >
                내 서재 보관
              </button>
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
                  <li key={item.id} className="library-item">
                    <span className="library-paper-title" title={item.title}>
                      {item.title}
                    </span>
                    <button className="remove-btn" onClick={() => handleRemovePaper(item.paperId)}>
                      제거
                    </button>
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
