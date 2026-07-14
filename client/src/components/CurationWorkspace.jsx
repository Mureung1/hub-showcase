import React from 'react';

function CurationWorkspace({ lang }) {
  return (
    <section id="container-c" className="bento-card container-c">
      
      {/* C-Left: 큐레이션 결과 리스트 뷰 (45% 폭) */}
      <div className="container-c-left">
        <div className="sub-card-header">
          <h2 className="card-title">Container C (좌측): 큐레이션 결과</h2>
        </div>
        <div className="sub-card-content">
          <p className="placeholder-text">매칭 스코어(%) 기준 정렬 논문 목록</p>
          
          {/* Paper Card 1 (90% 이상 고정밀 매칭 - 그린 뱃지) */}
          <div className="paper-card high-match">
            <div className="ribbon-badge">98% Match</div>
            <h3 className="paper-title">Lost in the Middle: How Language Models Use Long Contexts</h3>
            <p className="paper-authors">Nelson F. Liu, Kevin Lin, John Hewitt, Percy Liang...</p>
            <div className="paper-meta">
              <span className="paper-channel">arXiv</span> • <span className="paper-year">2023</span>
            </div>
          </div>

          {/* Paper Card 2 (80%대 중정밀 매칭 - 옐로우 뱃지) */}
          <div className="paper-card medium-match">
            <div className="ribbon-badge yellow">85% Match</div>
            <h3 className="paper-title">Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks</h3>
            <p className="paper-authors">Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni...</p>
            <div className="paper-meta">
              <span className="paper-channel">NeurIPS</span> • <span className="paper-year">2020</span>
            </div>
          </div>
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
                <strong>연구 배경 및 한계 원인 (Research Background & Limitations):</strong> 긴 입력 컨텍스트에서 언어 모델이 중간에 위치한 중요 정보를 효과적으로 검색하거나 추출하지 못하고 망각하는 현상을 최초 규명함.
              </div>
            </div>

            <div className="insight-item">
              <div className="number-circle">2</div>
              <div className="insight-text">
                <strong>제안하는 핵심 방법론 (Proposed Core Method):</strong> 멀티키 검색 및 키-값 탐색 테스트셋을 활용해 입력 데이터 내 타깃 정보 위치 변화에 따른 정확도 성능의 U자형 곡선 모델링을 제안함.
              </div>
            </div>

            <div className="insight-item">
              <div className="number-circle">3</div>
              <div className="insight-text">
                <strong>구체적 개선 결과 및 수치 (Specific Results & Metrics):</strong> 정보가 중간에 있을 때 모델 정확도가 최대 40% 이상 하락했으며, 모델의 절대적 크기가 커지더라도 중간 정보 유실 문제는 해소되지 않음을 검증함.
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
