import React from 'react';
import './App.css';

function App() {
  return (
    <div className="app-container">
      {/* 전체 레이아웃을 좌우로 나누는 컨테이너 */}
      <div className="app-layout">
        
        {/* 왼쪽: 기존 다크모드 기획안 영역 */}
        <div className="info-column">
          <header className="app-header">
            <span className="badge">Mini Mission</span>
            <h1>N111_양서형 프로젝트</h1>
          </header>

          <section className="intro-card">
            <h2>🌤️ 웨더마켓 (WeatherMarket AI)</h2>
            <p className="subtitle">소상공인 날씨 연동 맞춤형 마케팅/재고 관리 에이전트</p>
            
            <div className="info-grid">
              <div className="info-item">
                <strong>🎯 타겟 고객</strong>
                <p>지역 소상공인 (카페, 요식업, 미용업 등)</p>
              </div>
              <div className="info-item">
                <strong>💡 핵심 가치</strong>
                <p>매일 바뀌는 날씨 데이터를 AI가 분석하여 매출 방어 마케팅 자동 제안</p>
              </div>
            </div>
          </section>

          <section className="workflow-section">
            <h3>🤖 AI Agent Workflow</h3>
            <div className="workflow-steps">
              <div className="step">
                <span className="step-num">01</span>
                <h4>인지</h4>
                <p>부산 기상 데이터 수집</p>
              </div>
              <div className="step">
                <span className="step-num">02</span>
                <h4>판단</h4>
                <p>LLM 기반 마케팅 전략 분석</p>
              </div>
              <div className="step">
                <span className="step-num">03</span>
                <h4>행동</h4>
                <p>맞춤형 메시지 생성 및 발송</p>
              </div>
            </div>
          </section>

          <div className="details-grid">
            <section className="detail-box">
              <h3>📱 React 화면 구성</h3>
              <ul>
                <li><strong>대시보드 메인:</strong> 날씨 정보 + AI 한 줄 브리핑</li>
                <li><strong>제안 피드:</strong> 프로모션 제안 및 생성 문구 확인/발송</li>
                <li><strong>과거 이력:</strong> 마케팅 액션 및 가상 효과 리포트</li>
              </ul>
            </section>

            <section className="detail-box">
              <h3>📅 4주 개발 로드맵</h3>
              <ol>
                <li><strong>1주차:</strong> 기획 구체화, API 연동, React 세팅</li>
                <li><strong>2주차:</strong> OpenAI API 연동 및 프롬프트 엔지니어링</li>
                <li><strong>3주차:</strong> React 대시보드 UI 개발</li>
                <li><strong>4주차:</strong> 에이전트 피드백 루프 완성 및 배포</li>
              </ol>
            </section>
          </div>
        </div>

        {/* 오른쪽: 앱 목업 (UI 미리보기) 영역 */}
        <div className="mockup-column">
          <div className="tablet-mockup">
            <header className="tablet-header">
              <span className="logo">WeatherMarket</span>
              <span className="status-badge">AI 작동 중</span>
            </header>
            
            <div className="tablet-content">
              <div className="weather-info">
                <h2>내일 부산 날씨: 비 🌧️</h2>
                <p>강수확률 80% · 미세먼지 좋음</p>
              </div>
              
              <div className="ai-briefing">
                <strong>💡 AI 브리핑</strong>
                <p>사장님, 내일 비 소식으로 따뜻한 라떼와 디저트 주문이 늘어날 것 같습니다.</p>
              </div>

              <div className="action-card">
                <div className="action-header">
                  <span>최근 1달 방문 고객</span>
                  <span className="tag">마케팅 제안</span>
                </div>
                <div className="action-body">
                  "오늘 비 오는데 따뜻한 라떼 어떠세요? 10% 깜짝 할인 쿠폰!"
                </div>
                <div className="action-footer">
                  <button className="btn-reject">문구 수정</button>
                  <button className="btn-approve">발송 승인</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      <footer className="app-footer">
        <p>Developed by N111_양서형 | Tech Stack: React, Vite</p>
      </footer>
    </div>
  );
}

export default App;