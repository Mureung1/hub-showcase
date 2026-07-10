import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';

const MATCH_CHIPS = [
  { v: 'all', label: '전체' },
  { v: 'maxVariety', label: '재료 최대활용' },
  { v: 'complete100', label: '100% 완성' },
];
const LEVEL_CHIPS = [
  { v: 'all', label: '난이도 전체' },
  { v: 'beginner', label: '🟢 초보자' },
  { v: 'mid', label: '🟡 중급자' },
];

export default function ShoppingSets() {
  const { openShoppingList } = useApp();
  const [match, setMatch] = useState('all');
  const [level, setLevel] = useState('all');
  const [sets, setSets] = useState([]);

  useEffect(() => { api.getShoppingSets({ match, level }).then((r) => setSets(r.sets)); }, [match, level]);

  return (
    <section className="screen active">
      <div className="appbar"><h1>추천 재료 세트</h1></div>
      <div className="content">
        <div className="chips" style={{ marginBottom: 6 }}>
          {MATCH_CHIPS.map((c) => (
            <span key={c.v} className={`chip${match === c.v ? ' on' : ''}`} onClick={() => setMatch(c.v)}>{c.label}</span>
          ))}
        </div>
        <div className="chips">
          {LEVEL_CHIPS.map((c) => (
            <span key={c.v} className={`chip${level === c.v ? ' on' : ''}`} onClick={() => setLevel(c.v)}>{c.label}</span>
          ))}
        </div>
        <div className="notice">🧊 냉장고에 남은 재료를 최대한 활용하는 조합으로 골랐어요. 이미 있는 재료는 구매 목록에서 빠져요.</div>

        {sets.map((s) => (
          <div key={s.id} className="card tap" onClick={() => openShoppingList(s.id)}>
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

        {sets.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--sub)' }}>조건에 맞는 세트가 없어요. 필터를 바꿔보세요.</p>
          </div>
        )}
      </div>
    </section>
  );
}
