import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function CookDone() {
  const { fridge, deductionState, editingDeduction, setEditingDeduction, adjustDeduction, finishCooking } = useApp();
  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await finishCooking();
    } finally {
      setFinishing(false);
    }
  };

  const rows = deductionState.map((d, i) => ({ ...d, f: fridge[d.id], i }));

  return (
    <section className="screen active">
      <div className="appbar"><h1>요리 완료</h1></div>
      <div className="content">
        <div className="done-hero">
          <div className="d-emoji">🎉</div>
          <h2>맛있게 드세요!</h2>
          <p>레시피 기준으로 냉장고 재고가 자동 차감됐어요</p>
        </div>

        {!editingDeduction ? (
          <div>
            <div className="section-title">차감된 재료 <a onClick={() => setEditingDeduction(true)}>✏️ 사용량 수정</a></div>
            <div className="card" style={{ padding: '6px 16px' }}>
              {rows.length === 0 && <div className="ing-row" style={{ borderBottom: 'none' }}><span className="nm" style={{ color: 'var(--sub)' }}>차감할 재료가 없어요</span></div>}
              {rows.map((d, i) => {
                if (!d.f) return null;
                const before = d.f.qtyLabel;
                const sojin = d.use > 0 && d.use >= d.max;
                const afterAmt = Math.max(0, d.max - d.use);
                const after = sojin ? '소진' : `${afterAmt}${d.unit || ''}`;
                return (
                  <div key={d.id} className="ing-row" style={i === rows.length - 1 ? { borderBottom: 'none' } : undefined}>
                    <span className="ck">{d.f.emoji}</span>
                    <span className="nm">{d.f.name}{d.addon && <> <span className="badge green">추가 재료</span></>}</span>
                    <span className="amt">{before} → {sojin ? <b style={{ color: 'var(--red)' }}>{after}</b> : after}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="section-title">실제 사용량 보정 <a onClick={() => setEditingDeduction(false)}>✓ 수정 완료</a></div>
            <div className="card" style={{ padding: '6px 16px' }}>
              {rows.length === 0 && <div className="ing-row" style={{ borderBottom: 'none' }}><span className="nm" style={{ color: 'var(--sub)' }}>차감할 재료가 없어요</span></div>}
              {rows.map((d, i) => {
                if (!d.f) return null;
                const afterAmt = Math.max(0, d.max - d.use);
                const step = d.unit === 'g' ? 50 : (d.unit === '쪽' || d.unit === '단' ? 0.25 : (d.unit === '모' || d.unit === '개' ? 0.5 : 1));
                return (
                  <div key={d.id} className="ing-row" style={i === rows.length - 1 ? { borderBottom: 'none' } : undefined}>
                    <span className="ck">{d.f.emoji}</span>
                    <span className="nm">{d.f.name}{d.addon && <> <span className="badge green">추가 재료</span></>}</span>
                    {d.fixed ? <span className="amt">전량 사용</span> : (
                      <span className="stepper">
                        <button onClick={() => adjustDeduction(d.i, -step)} disabled={d.use <= 0}>−</button>
                        <span>{afterAmt === 0 ? '소진' : `${afterAmt}${d.unit || ''}`} 남음</span>
                        <button onClick={() => adjustDeduction(d.i, step)} disabled={d.use >= d.max}>＋</button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="notice">실제로 쓴 만큼 −/＋로 조절하면 냉장고에 그대로 반영돼요</div>
          </div>
        )}
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" disabled={finishing} onClick={handleFinish}>
          {finishing ? '반영하는 중…' : '냉장고 확인하기'}
        </button>
      </div>
    </section>
  );
}
