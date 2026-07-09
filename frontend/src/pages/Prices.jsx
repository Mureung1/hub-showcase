import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';

export default function Prices() {
  const { back } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => { api.getPrices().then(setData); }, []);
  if (!data) return null;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>식자재 가격 정보</h1></div>
      <div className="content">
        <div className="notice">📈 매일 아침 온라인 마트 평균가를 가져와요 · {data.updatedAt} 기준</div>
        {data.items.map((it) => (
          <div className="row" key={it.name}>
            <div className="emoji">{it.emoji}</div>
            <div className="info"><div className="name">{it.name}</div><div className="meta">평균 {it.avg.toLocaleString()}원</div></div>
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
