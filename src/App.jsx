import React from 'react';

function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '750px', margin: '40px auto', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', backgroundColor: '#fff' }}>
      
      {/* 상단 헤더 영역 */}
      <div style={{ marginBottom: '30px' }}>
        <span style={{ backgroundColor: '#e2fbe8', color: '#00c73c', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
          💡 본 과정 프로젝트 기획 (임시)
        </span>
        <h1 style={{ color: '#0f172a', fontSize: '1.9rem', marginTop: '15px', marginBottom: '10px', lineHeight: '1.4' }}>
          실시간 날씨 및 상권 데이터 연동 기반<br />
          <span style={{ color: '#00c73c' }}>소상공인 마케팅 자동화 AI 에이전트 서비스</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.05rem', marginTop: '0', lineHeight: '1.5' }}>
          기상청 날씨 API와 지역 데이터를 활용한 소상공인 매장 마케팅 생산성 향상 플랫폼
        </p>
      </div>

      <hr style={{ border: '0', height: '1px', background: '#f1f5f9', margin: '24px 0' }} />

      {/* 서비스 개요 */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#0f172a', fontSize: '1.3rem', borderLeft: '4px solid #00c73c', paddingLeft: '10px', marginBottom: '12px' }}>
          🎯 서비스 개요
        </h2>
        <p style={{ lineHeight: '1.7', color: '#334155', fontSize: '1rem', margin: '0' }}>
          기상청 날씨 API와 지역/시간 데이터를 AI 에이전트가 스스로 실시간으로 수집(**Function Calling**)하고 분석합니다. 
          이를 통해 날씨 변화와 상권 특성에 맞춰 소상공인의 배달앱 공지사항 및 SNS 마케팅 카피라이팅을 자동으로 생성하고 최적화해 주는 스마트 생산성 인프라입니다.
        </p>
      </section>

      {/* 핵심 테크 메커니즘 */}
      <section style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '35px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#0f172a' }}>
          ⚙️ AI 에이전트 핵심 작동 방식
        </h3>
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '5px' }}>1. 동적 데이터 수집 (Function Calling)</strong>
            <span style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
              LLM이 현재 기상 변수(강수량, 기온, 습도 등)가 필요하다고 판단하면, 실시간으로 외부 기상청 API를 동적 호출하여 필요한 정형 데이터를 스스로 확보합니다.
            </span>
          </div>
          <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '5px' }}>2. 상황 맞춤형 컨텐츠 최적화 자동화</strong>
            <span style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
              분석된 로컬 데이터를 기반으로 "비 오는 금요일 저녁 배달 수요 급증 시점"에 최적화된 배달앱 이벤트 공지 문구 및 인스타그램 마케팅 카피를 AI가 즉시 자동 발행합니다.
            </span>
          </div>
        </div>
      </section>

      {/* 4주간 개발 목표 */}
      <section>
        <h2 style={{ color: '#0f172a', fontSize: '1.3rem', borderLeft: '4px solid #00c73c', paddingLeft: '10px', marginBottom: '12px' }}>
          🚀 향후 개발 태스크
        </h2>
        <ul style={{ paddingLeft: '20px', margin: '0', lineHeight: '1.8', color: '#334155' }}>
          <li>Vite + React 기반의 소상공인용 실시간 대시보드 모니터링 UI 구축</li>
          <li>기상청 공공데이터 API 및 LLM 오케스트레이션 프레임워크 연동</li>
          <li>상황별 맞춤 프롬프트 엔지니어링 및 백엔드 데이터 분석 레이어 설계</li>
        </ul>
      </section>

    </div>
  );
}

export default App;