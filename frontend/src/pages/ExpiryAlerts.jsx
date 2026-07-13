import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import Row from '../components/Row';
import RecipeCard from '../components/RecipeCard';

const MSG_MAP = { 'D-1': '내일까지 드셔야 해요', 'D-2': '모레까지 드셔야 해요' };

export default function ExpiryAlerts() {
  const { back, fridge, openRecipeDetail } = useApp();
  const [data, setData] = useState({ items: [], relatedRecipes: [] });

  useEffect(() => { api.getExpiryAlerts().then(setData); }, [fridge]);

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>유통기한 임박 알림</h1></div>
      <div className="content">
        <div className="notice">🔔 임박 재료는 냉장고에서 <b style={{ color: 'var(--red)' }}>빨간 글자</b>로 표시되고, D-2부터 푸시 알림을 보내드려요.</div>
        <div>
          {data.items.length ? data.items.map((f) => (
            <Row key={f.id} emoji={f.emoji} name={`${f.name} ${f.qtyLabel}`} nameColor="var(--red)"
              meta={MSG_MAP[f.expiry] || `${f.expiry} 안에 드세요`} right={<span className="badge red">{f.expiry}</span>} />
          )) : <p style={{ fontSize: 13, color: 'var(--sub)' }}>임박한 재료가 없어요 👍</p>}
        </div>

        <div className="section-title">임박 재료 소진 레시피 🍳</div>
        <div>
          {data.relatedRecipes.length ? data.relatedRecipes.map((r) => (
            <RecipeCard key={r.id} recipe={r}
              extra={<div className="meta">{r.usedNames.join('·')} 소진 · {r.levelLabel} · {r.time}분</div>}
              onClick={() => openRecipeDetail(r.id)} />
          )) : <p style={{ fontSize: 13, color: 'var(--sub)' }}>지금은 추천할 레시피가 없어요</p>}
        </div>
      </div>
    </section>
  );
}
