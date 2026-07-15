import React from 'react';

function CurationWorkspace({ lang, curationData }) {
  if (!curationData) {
    return (
      <section id="container-c" className="bento-card container-c" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: '500' }}>
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
          
          {curationData.papers && curationData.papers.map((paper) => (
            <div 
              key={paper.id} 
              className={`paper-card ${paper.matchScore >= 90 ? 'high-match' : 'medium-match'}`}
            >
              <div className={`ribbon-badge ${paper.matchScore >= 90 ? '' : 'yellow'}`}>
                {paper.matchScore}% Match
              </div>
              <h3 className="paper-title">{paper.title}</h3>
              <p className="paper-authors">{paper.authors}</p>
              <div className="paper-meta">
                <span className="paper-channel">{paper.channel}</span> • <span className="paper-year">{paper.year}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* C-Right: 3줄 핵심 인사이트 보드 및 내 서재 보관함 (55% 폭) */}
      <div className="container-c-right">
        <div className="sub-card-header">
          <h2 className="card-title">Container C (우측): 데일리 인사이트 & 서재</h2>
        </div>
        <div className="sub-card-content scroll-y">
          
          {/* 3줄 요약 인사이트 패널 */}
          <div className="insight-panel">
            <h4 className="panel-subtitle">💡 에이전트 3줄 핵심 요약</h4>
            
            <div className="insight-item">
              <div className="number-circle">1</div>
              <div className="insight-text">
                <strong>연구 배경 및 한계 원인 (Research Background & Limitations):</strong> {curationData.insights.background}
              </div>
            </div>

            <div className="insight-item">
              <div className="number-circle">2</div>
              <div className="insight-text">
                <strong>제안하는 핵심 방법론 (Proposed Core Method):</strong> {curationData.insights.coreMethod}
              </div>
            </div>

            <div className="insight-item">
              <div className="number-circle">3</div>
              <div className="insight-text">
                <strong>구체적 개선 결과 및 수치 (Specific Results & Metrics):</strong> {curationData.insights.quantitativeResult}
              </div>
            </div>
            
            <button id="add-to-library-btn" className="archive-btn">내 서재 보관</button>
          </div>

          {/* 내 서재 보관함 라이브러리 */}
          <div className="library-panel">
            <h4 className="panel-subtitle">📚 내 서재 보관함 (My Library)</h4>
            <ul className="library-list">
              <li className="library-item">
                <span className="library-paper-title">Lost in the Middle: How Language...</span>
                <button className="remove-btn">제거</button>
              </li>
              <li className="library-item">
                <span className="library-paper-title">Retrieval-Augmented Generation for...</span>
                <button className="remove-btn">제거</button>
              </li>
            </ul>
          </div>

        </div>
      </div>

    </section>
  );
}

export default CurationWorkspace;
