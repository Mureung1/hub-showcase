import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';

export default function Prices() {
  const { back } = useApp();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { api.getPrices().then(setData); }, []);

  const items = useMemo(() => {
    if (!data) return [];
    const keyword = q.trim();
    return keyword ? data.items.filter((it) => it.name.includes(keyword)) : data.items;
  }, [data, q]);

  if (!data) return null;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>식자재 가격 정보</h1></div>
      <div className="content">
        <div className="notice">📈 매일 아침 KAMIS 실시간 시세를 가져와요(일부 재료는 조사 데이터가 없어 참고 평균가로 대신해요) · {data.updatedAt} 기준</div>
        <div style={{ padding: '0 0 12px' }}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 재료 이름으로 검색 (예: 양파)"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 15, background: 'var(--bg-card)', color: 'var(--text)', boxSizing: 'border-box' }}
          />
        </div>
        {items.length === 0 && <div className="notice">검색 결과가 없어요.</div>}
        {items.map((it) => (
          <div className="row" key={it.id ?? it.name}>
            <div className="emoji">{it.emoji}</div>
            <div className="info">
              <div className="name">{it.name}</div>
              <div className="meta">
                평균 {it.avg.toLocaleString()}원
                {it.source === 'static' && <span style={{ color: 'var(--sub)' }}> · 참고가</span>}
              </div>
            </div>
            <div className="right">
              <span className={it.diff >= 0 ? 'price-up' : 'price-down'}>
                {it.diff >= 0 ? '▲' : '▼'} {Math.abs(it.diff).toLocaleString()}원
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
