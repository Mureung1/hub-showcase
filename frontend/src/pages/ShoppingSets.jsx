import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';

export default function ShoppingSets() {
  const { go } = useApp();
  const [sets, setSets] = useState([]);

  useEffect(() => { api.getShoppingSets().then((r) => setSets(r.sets)); }, []);

  return (
    <section className="screen active">
      <div className="appbar"><h1>추천 재료 세트</h1></div>
      <div className="content">
        <div className="chips">
          <span className="chip on">재료 최대활용</span>
          <span className="chip">100% 완성</span>
          <span className="chip on">🟢 초보자</span>
          <span className="chip">🟡 중급자</span>
        </div>
        <div className="notice">🧊 냉장고에 남은 <b>양파 · 대파 · 계란 · 김치</b>를 활용하는 조합으로 골랐어요. 이미 있는 재료는 구매 목록에서 빠져요.</div>

        {sets.map((s) => (
          <div key={s.id} className="card tap" onClick={() => go('shopping-list')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <b style={{ fontSize: 16 }}>{s.name}</b>
              {s.badge && <span className="badge green">{s.badge}</span>}
              {s.level && <span className="badge amber">{s.level}</span>}
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.6 }}>
              재료 <b style={{ color: 'var(--text)' }}>{s.buyCount}개 구매</b>로 <b style={{ color: 'var(--green-dark)' }}>{s.dishCount}가지 요리</b> 가능<br />{s.dishes}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 14, fontWeight: 800 }}>
              <span style={{ color: 'var(--sub)' }}>예상 비용</span><span style={{ color: 'var(--green-dark)' }}>약 {s.total.toLocaleString()}원</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
