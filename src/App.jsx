import React, { useState } from 'react';

// 디자인 시스템 및 스타일 정의
const styles = {
  container: { padding: '40px', fontFamily: '"Noto Sans KR", sans-serif', backgroundColor: '#f0fdf4', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  
  // 배경 장식 (바이러스 하나만 크게)
  decoVirus: { position: 'absolute', fontSize: '15rem', opacity: 0.07, zIndex: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' },

  // 1. 메인 홈 화면: 겹침 방지 및 2x2 배치
  homeHeader: { textAlign: 'center', marginBottom: '80px', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '30px' },
  mainTitle: { color: '#10b981', fontSize: '6rem', margin: '0', fontWeight: '800', letterSpacing: '-2px', lineHeight: '1.1' },
  subtitle: { color: '#475569', fontSize: '1.8rem', fontWeight: '400', margin: '0' },
  
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', width: '100%', maxWidth: '700px', zIndex: 1 },
  menuBox: { backgroundColor: '#ffffff', padding: '50px 20px', borderRadius: '30px', boxShadow: '0 15px 30px rgba(16, 185, 129, 0.12)', border: '2px solid #bbf7d0', cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s ease' },

  // 상세 페이지 공통
  pageContainer: { width: '100%', maxWidth: '1000px', backgroundColor: '#ffffff', padding: '60px', borderRadius: '40px', boxShadow: '0 30px 60px rgba(15, 23, 42, 0.1)', borderLeft: '15px solid #10b981', zIndex: 10, display: 'flex', flexDirection: 'column' },
  pageTitle: { fontSize: '3rem', color: '#0f172a', margin: '0 0 40px 0', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', textAlign: 'center' },
  homeButton: { alignSelf: 'center', marginTop: '40px', padding: '15px 35px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: '700', fontSize: '1.2rem' },

  // 2. Idea 페이지: 말풍선 정렬
  chatContainer: { display: 'flex', flexDirection: 'column', gap: '25px', backgroundColor: '#f8fafc', padding: '40px', borderRadius: '30px', marginBottom: '30px' },
  bubbleBase: { padding: '18px 25px', borderRadius: '25px', fontSize: '1.2rem', maxWidth: '75%', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  bubbleStudent: { alignSelf: 'flex-start', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '25px 25px 25px 0' },
  bubbleAI: { alignSelf: 'flex-end', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '25px 25px 0 25px', textAlign: 'right' },

  // 3. 예상 모습 페이지: 상세 연출
  expectedLayout: { display: 'flex', gap: '30px', height: '500px' },
  agentSidebar: { width: '30%', backgroundColor: '#f1f5f9', borderRadius: '25px', padding: '25px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' },
  agentChatLog: { flex: 1, backgroundColor: '#ffffff', borderRadius: '15px', padding: '15px', overflowY: 'auto', fontSize: '0.95rem' },
  mainDisplay: { width: '70%', backgroundColor: '#0f172a', borderRadius: '25px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  controlPanel: { position: 'absolute', bottom: '30px', right: '30px', backgroundColor: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(15px)', padding: '25px', borderRadius: '20px', width: '280px', color: '#ffffff' },
  sliderGroup: { marginBottom: '15px' },
  sliderLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', color: '#bbf7d0' }
};

function App() {
  const [view, setView] = useState('home');

  return (
    <div style={styles.container}>
      <div style={styles.decoVirus}>🦠</div>

      {view === 'home' && (
        <>
          <header style={styles.homeHeader}>
            <h1 style={styles.mainTitle}>나만의 작은 실험실</h1>
            <p style={styles.subtitle}>대학생을 위한 LLM 기반 미생물 군집 시뮬레이터</p>
          </header>

          <div style={styles.menuGrid}>
            <div style={styles.menuBox} onClick={() => setView('prob')}>
              <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🚨</div>
              <h3 style={{ fontSize: '1.8rem', margin: 0 }}>Problem</h3>
            </div>
            <div style={styles.menuBox} onClick={() => setView('idea')}>
              <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>💡</div>
              <h3 style={{ fontSize: '1.8rem', margin: 0 }}>Idea</h3>
            </div>
            <div style={styles.menuBox} onClick={() => setView('rm')}>
              <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>📅</div>
              <h3 style={{ fontSize: '1.8rem', margin: 0 }}>Roadmap</h3>
            </div>
            <div style={styles.menuBox} onClick={() => setView('expected')}>
              <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🖥️</div>
              <h3 style={{ fontSize: '1.8rem', margin: 0 }}>예상 모습</h3>
            </div>
          </div>
        </>
      )}

      {view === 'prob' && (
        <div style={styles.pageContainer}>
          <h2 style={styles.pageTitle}>학부생 연구의 한계와 고통</h2>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <p style={{ fontSize: '1.5rem', margin: '15px 0' }}>1. 복잡한 개발 환경 : 리눅스와 파이썬 코딩 필수</p>
            <p style={{ fontSize: '1.5rem', margin: '15px 0' }}>2. 가독성 부재 : 영어 텍스트 기반의 불친절한 UI</p>
            <p style={{ fontSize: '1.5rem', margin: '15px 0' }}>3. 직관적 이해 부족 : 이론과 시뮬레이션의 괴리</p>
          </div>
          <div style={{ marginTop: '30px', fontSize: '2.8rem', fontWeight: '800', color: '#ef4444', backgroundColor: '#fef2f2', padding: '40px', borderRadius: '30px', textAlign: 'center', border: '3px dashed #fca5a5', lineHeight: '1.3' }}>
            "in vivo에서 무슨 일이 일어나는지<br />한 눈에 알 수가 없다 !"
          </div>
          <button style={styles.homeButton} onClick={() => setView('home')}>🏠 홈으로 돌아가기</button>
        </div>
      )}

      {view === 'idea' && (
        <div style={styles.pageContainer}>
          <h2 style={styles.pageTitle}>자연어로 시뮬레이션하다</h2>
          
          <div style={styles.chatContainer}>
            <div style={{ ...styles.bubbleBase, ...styles.bubbleStudent }}>
              👤 "항생제 투여 후 장내 미생물의 회복 과정을 보여줘"
            </div>
            <div style={{ ...styles.bubbleBase, ...styles.bubbleAI }}>
              🤖 "네 알겠습니다. NCBI DB를 기반으로 장내 미생물 10종의 시뮬레이션을 생성합니다..."
            </div>
          </div>

          <div style={{ padding: '20px', fontSize: '1.3rem', lineHeight: '2' }}>
            <div style={{ marginBottom: '15px' }}><strong>1. 현상 조절:</strong> 실험 조건과 Control에 따른 자유로운 현상 조절</div>
            <div style={{ marginBottom: '15px' }}><strong>2. 신뢰성 확보:</strong> NCBI, BLAST 등 거대 DB 데이터를 바탕으로 한 신뢰성</div>
            <div style={{ marginBottom: '15px' }}><strong>3. 직관적 시각화:</strong> 궁금한 실험 내용을 바로바로 눈으로 확인하고 정리</div>
          </div>

          <button style={styles.homeButton} onClick={() => setView('home')}>🏠 홈으로 돌아가기</button>
        </div>
      )}

      {view === 'rm' && (
        <div style={styles.pageContainer}>
          <h2 style={styles.pageTitle}>주차별 개발 마일스톤</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {['W1: 구상 및 데이터 준비 (NCBI/BLAST 수집)', 'W2: UI/UX 및 지능형 연동 (OpenAI API 연결)', 'W3: 개발 및 계산 로직 (알고리즘 엔진 개발)', 'W4: QA 및 최종 배포 (수정 및 웹 배포)'].map((step, i) => (
              <div key={i} style={{ padding: '25px', background: '#f8fafc', borderRadius: '20px', borderLeft: '10px solid #10b981', fontSize: '1.3rem' }}>
                {step}
              </div>
            ))}
          </div>
          <button style={styles.homeButton} onClick={() => setView('home')}>🏠 홈으로 돌아가기</button>
        </div>
      )}

      {view === 'expected' && (
        <div style={{ ...styles.pageContainer, maxWidth: '1150px' }}>
          <h2 style={styles.pageTitle}>서비스 예상 인터페이스</h2>
          
          <div style={styles.expectedLayout}>
            <div style={styles.agentSidebar}>
              <h4 style={{ margin: 0, color: '#334155' }}>💬 AI Agent Chat</h4>
              <div style={styles.agentChatLog}>
                <p style={{ color: '#0369a1' }}><strong>User:</strong> 항생제 투여 농도를 20mg으로 설정해줘.</p>
                <p style={{ color: '#15803d' }}><strong>Agent:</strong> 조건이 변경되었습니다. 박테리아 사멸 시뮬레이션을 갱신합니다.</p>
                <p style={{ color: '#0369a1' }}><strong>User:</strong> pH 수치도 6.5로 낮춰서 비교해볼래.</p>
                <p style={{ color: '#15803d' }}><strong>Agent:</strong> 산성 환경 조건이 추가되었습니다. 결과 차트를 확인하세요.</p>
              </div>
              <div style={{ height: '45px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #ddd' }}></div>
            </div>

            <div style={styles.mainDisplay}>
              <div style={{ position: 'absolute', top: '30px', color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>LIVE SIMULATION SCREEN</div>
              
              <div style={styles.controlPanel}>
                <h4 style={{ margin: '0 0 20px 0', color: '#10b981', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>Environment Control</h4>
                
                <div style={styles.sliderGroup}>
                  <div style={styles.sliderLabel}><span>pH Level</span><span>7.4</span></div>
                  <div style={{ height: '6px', background: '#10b981', borderRadius: '3px', width: '80%' }}></div>
                </div>

                <div style={styles.sliderGroup}>
                  <div style={styles.sliderLabel}><span>Temperature</span><span>37.0°C</span></div>
                  <div style={{ height: '6px', background: '#10b981', borderRadius: '3px', width: '95%' }}></div>
                </div>

                <div style={styles.sliderGroup}>
                  <div style={styles.sliderLabel}><span>Antibiotics (mg)</span><span>20mg</span></div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px', width: '40%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <button style={styles.homeButton} onClick={() => setView('home')}>🏠 홈으로 돌아가기</button>
        </div>
      )}
    </div>
  );
}

export default App;