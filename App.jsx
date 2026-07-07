import React from 'react';

export default function App() {
  const snacks = [
    { name: '후레쉬 베리', desc: '펑리수맛', score: 88, review: '파인애플 과육의 산미와 부드러운 필링의 조화' },
    { name: '오예스', desc: '우베라떼맛', score: 82, review: '우베 특유의 고소한 풍미와 진한 라떼 레이어링' },
    { name: '두바이 찰떡파이', desc: '피스타치오&카다이프', score: 95, review: '바삭한 카다이프 질감과 쫀득한 떡의 고급스러운 식감' }
  ];

  return (
    <div style={{ padding: '40px 8%', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Pretendard', sans-serif", color: '#0f172a' }}>
      
      {/* 1. 상단 대시보드 요약 (전문성 강화) */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Snack Curator Dashboard</h1>
          <p style={{ color: '#64748b' }}>최종 업데이트: 2026. 07. 07 | 시스템 상태: <span style={{ color: '#16a34a' }}>● Operational</span></p>
        </div>
        <button style={{ padding: '12px 24px', backgroundColor: '#1e3a8a', color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>데이터 리포트 다운로드</button>
      </header>

      {/* 2. 메인 카드 영역 */}
      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '40px' }}>
        {/* 리스트 영역 */}
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>Priority Analytics List</h2>
          {snacks.map((snack, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h4 style={{ margin: 0 }}>{snack.name} <small style={{ color: '#64748b' }}>({snack.desc})</small></h4>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#475569' }}>"{snack.review}"</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>{snack.score}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sentiment Score</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 우측 사이드 바 (시스템 요약) */}
        <div style={{ backgroundColor: '#1e3a8a', padding: '30px', borderRadius: '20px', color: 'white' }}>
          <h3>System Status</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>데이터베이스 연동 완료. 실시간 신상 알림 엔진이 가동 중입니다.</p>
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>Active Curation Request</p>
            <h2 style={{ margin: '5px 0' }}>1,284</h2>
          </div>
        </div>
      </section>

      {/* 3. 심화 기능 영역 (내용 대폭 보강) */}
      <section>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>Advanced Curation Framework</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { title: "NLP Sentiment Engine", text: "수만 건의 인스타그램 및 블로그 리뷰를 자연어 처리 기술로 분석해 '맛의 키워드'를 정밀 추출합니다." },
            { title: "Inventory Prediction", text: "지역별/편의점별 재고 데이터를 학습하여, 가장 빠르게 제품을 구할 수 있는 위치를 산출합니다." },
            { title: "Taste Correlation", text: "개인의 구매 이력을 분석하여 새로운 제품의 만족도를 85% 이상의 정확도로 예측합니다." }
          ].map((item, i) => (
            <div key={i} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ marginTop: 0, color: '#1e40af' }}>{item.title}</h4>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}