import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ServingSizeSetting() {
  const { back, servingMultiplier, setServingMultiplier } = useApp();
  
  const rawScore = Math.round(servingMultiplier / 0.2) - 1;
  const initialScore = Number.isFinite(rawScore) ? Math.min(9, Math.max(1, rawScore)) : 4;
  const [scores, setScores] = useState({
    m1: initialScore,
    m2: initialScore,
    m3: initialScore
  });

  const handleSave = () => {
    const avgScore = (scores.m1 + scores.m2 + scores.m3) / 3;
    const mult = (avgScore + 1) * 0.2;
    // 소수점 0.1 단위로 내림
    const finalMult = Math.floor(mult * 10) / 10;
    
    setServingMultiplier(finalMult);
    back();
  };

  const updateScore = (id, val) => {
    setScores(prev => ({ ...prev, [id]: val }));
  };

  const renderScale = (id) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12, color: 'var(--sub)' }}>
        <span>적게 먹어요</span>
        <span>많이 먹어요</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(val => (
          <div key={val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <input 
              type="radio" 
              id={`${id}-scale-${val}`}
              name={`${id}-serving-scale`}
              value={val}
              checked={scores[id] === val}
              onChange={() => updateScore(id, val)}
              style={{ width: 18, height: 18, accentColor: 'var(--green-dark)' }}
            />
            <label htmlFor={`${id}-scale-${val}`} style={{ fontSize: 11, color: val === 4 ? 'var(--green-dark)' : 'var(--text)', fontWeight: val === 4 ? 700 : 400 }}>
              {val === 4 ? '표준' : val}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>내 인분 설정</h1></div>
      <div className="content">
        <div className="notice">🍽️ 레시피와 장보기 계산의 기준이 되는 내 1인분을 설정합니다.</div>
        
        <div className="card" style={{ padding: '20px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>🥘</div>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>제육볶음</h2>
              <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>나는 보통 어느 정도 먹어야 배가 부른가요?</div>
            </div>
          </div>
          {renderScale('m1')}
        </div>

        <div className="card" style={{ padding: '20px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>🥞</div>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>파전</h2>
              <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>나는 보통 어느 정도 먹어야 배가 부른가요?</div>
            </div>
          </div>
          {renderScale('m2')}
        </div>

        <div className="card" style={{ padding: '20px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>🍛</div>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>김치볶음밥</h2>
              <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>나는 보통 어느 정도 먹어야 배가 부른가요?</div>
            </div>
          </div>
          {renderScale('m3')}
        </div>

      </div>
      
      <div className="bottom-fixed">
        <button className="btn primary" onClick={handleSave}>설정 저장하기</button>
      </div>
    </section>
  );
}
