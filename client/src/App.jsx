import { useState } from 'react'
import './App.css'

function App() {
  const [lang, setLang] = useState('KO')

  return (
    <div className="app-container">
      {/* A. Global Header */}
      <header className="global-header">
        <div className="header-left">
          <span className="brand-logo" role="img" aria-label="sparkles">✨</span>
          <h1 className="brand-title">Scholar-Sync AI</h1>
        </div>
        
        <nav className="header-nav">
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">My Library</button>
          <button className="nav-item">Discover</button>
          <button className="nav-item">Settings</button>
        </nav>
        
        <div className="header-right">
          <button 
            id="lang-toggle-btn"
            className="lang-toggle" 
            onClick={() => setLang(lang === 'KO' ? 'EN' : 'KO')}
          >
            🌐 {lang === 'KO' ? 'KO / EN' : 'EN / KO'}
          </button>
          <div className="user-profile">
            <span className="user-icon" role="img" aria-label="user">👤</span>
          </div>
        </div>
      </header>

      {/* B. 2x2 Bento Grid Area */}
      <main className="bento-grid">
        
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

        {/* Container C: 인사이트 및 서재 (Bottom Row - Full Width 100%) */}
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

      </main>
    </div>
  )
}

export default App
