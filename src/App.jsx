import React from 'react';
import './App.css';

function App() {
  return (
    <div className="app-container">
      {/* 헤더 섹션 */}
      <header className="app-header">
        <span className="badge">Mini Mission</span>
        <h1>N111_양서형 프로젝트 소개</h1>
      </header>

      <main className="app-content">
        {/* 프로젝트 개요 */}
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
              <p>매일 바뀌는 날씨 데이터를 AI가 분석하여 매출을 방어할 수 있는 마케팅 문구 작성 및 프로모션 제안 자율 수행</p>
            </div>
          </div>
        </section>

        {/* AI Agent Workflow */}
        <section className="workflow-section">
          <h3>🤖 AI Agent Workflow (핵심 기능)</h3>
          <div className="workflow-steps">
            <div className="step">
              <span className="step-num">01</span>
              <h4>인지 (Perception)</h4>
              <p>공공 날씨 API를 통해 매일 부산 기상 데이터(강수확률, 기온, 미세먼지 등) 수집</p>
            </div>
            <div className="step">
              <span className="step-num">02</span>
              <h4>판단 (Reasoning)</h4>
              <p>LLM(OpenAI)이 날씨 데이터와 업종별 특성을 결합하여 상황별 마케팅 전략 분석</p>
            </div>
            <div className="step">
              <span className="step-num">03</span>
              <h4>행동 (Action)</h4>
              <p>맞춤형 마케팅 메시지(알림톡/SMS 형태) 초안 자동 생성 및 사장님 앱 승인 후 발송</p>
            </div>
          </div>
        </section>

        {/* 화면 구성 및 로드맵 */}
        <div className="details-grid">
          <section className="detail-box">
            <h3>📱 React 화면 구성 (4주 범위)</h3>
            <ul>
              <li><strong>대시보드 메인:</strong> 날씨 정보 + AI 에이전트의 오늘의 한 줄 브리핑</li>
              <li><strong>에이전트 제안 피드:</strong> 프로모션 제안 및 생성 문구 확인/수정/발송 버튼</li>
              <li><strong>과거 이력 탭:</strong> 에이전트 수행 마케팅 액션 및 가상 효과 리포트</li>
            </ul>
          </section>

          <section className="detail-box">
            <h3>📅 4주 개발 로드맵</h3>
            <ol>
              <li><strong>1주차:</strong> 기획 구체화, 날씨 API 연동 및 DB 설계, React 프로젝트 세팅</li>
              <li><strong>2주차:</strong> OpenAI API 연동 및 마케팅 문구 생성 Prompt Engineering</li>
              <li><strong>3주차:</strong> React 대시보드 UI 개발 및 AI API 연동</li>
              <li><strong>4주차:</strong> 에이전트 피드백 루프(수정/발송) 완성, 테스트 및 배포</li>
            </ol>
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>Developed by N111_양서형 | Tech Stack: React, Vite</p>
      </footer>
    </div>
  );
}

export default App;