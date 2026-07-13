import React from 'react';

function App() {
  const containerStyle = {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '40px auto',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    color: '#333'
  };

  const tagStyle = {
    display: 'inline-block',
    backgroundColor: '#e3f2fd',
    color: '#0d47a1',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '10px'
  };

  const listStyle = {
    paddingLeft: '20px',
    lineHeight: '1.6' // 대시(-) 제거 및 대문자 H로 수정 완료
  };

  return (
    <div style={containerStyle}>
      <span style={tagStyle}>4주 프로젝트 주제</span>
      <h1 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#0d47a1' }}>
        GNU 전공/교양 수강신청 AI 네비게이터
      </h1>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
        복잡한 졸업 요건과 학과별 요람을 분석하여 학생 개인 맞춤형 시간표를 추천하는 AI Agent 서비스
      </p>

      <hr style={{ border: '0', height: '1px', backgroundColor: '#eee', margin: '20px 0' }} />

      <h3>🎯 해결하고자 하는 문제</h3>
      <ul style={listStyle}>
        <li>매 학기 복잡한 PDF 요람을 보며 졸업 요건과 필수 선이수 과목을 직접 계산해야 하는 번거로움</li>
        <li>특히 편입생이나 다전공자의 경우 학점 계산과 진로 로드맵 설계의 난이도가 매우 높음</li>
      </ul>

      <h3>🤖 AI Agent의 핵심 역할</h3>
      <ul style={listStyle}>
        <li>"졸업까지 교양 6학점 남았고, 우주공강 없이 데이터 분석 진로에 맞는 시간표 짜줘"와 같은 자연어 명령 수행</li>
        <li>경상국립대 교육과정 데이터(RAG)를 기반으로 최적의 시간표 시뮬레이션 및 조합 제안</li>
      </ul>
    </div>
  );
}

export default App;