import React from 'react';

function ProfileBoard() {
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
                <span className="badge">Natural Language Processing <span className="delete-x">×</span></span>
                <span className="badge">Retrieval-Augmented Generation <span className="delete-x">×</span></span>
                <span className="badge">AI Agents <span className="delete-x">×</span></span>
              </div>
              <div className="keyword-input-form">
                <input 
                  type="text" 
                  id="keyword-input-field"
                  placeholder="새로운 연구 키워드 입력..." 
                  className="keyword-input" 
                />
                <button id="add-keyword-btn" className="add-btn">+</button>
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
              placeholder="찾고자 하는 논문의 핵심 질문이나 키워드 조합을 입력하세요."
              defaultValue="최신 LLM Agent의 멀티모달 추론 능력 향상 방안에 대한 논문을 찾아줘."
            />
            
            <button id="start-curation-btn" className="master-action-btn">
              큐레이션 시작
            </button>
            
            <div className="analysis-status">
              <div className="status-label">에이전트 실시간 분석 대기 중 (30%)</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '30%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ProfileBoard;
