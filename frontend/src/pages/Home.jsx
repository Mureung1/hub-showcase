import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { fridgeAvailable, imminentIds } from '../logic/fridgeLogic';
import Row from '../components/Row';
import RecipeCard from '../components/RecipeCard';

export default function Home() {
  const { fridge, go, tab, openRecipeDetail } = useApp();
  const [recipeStats, setRecipeStats] = useState({ items: [], total: 0 });

  useEffect(() => {
    if (Object.keys(fridge).length) api.getRecipes({ filter: 'all', level: 'all' }).then(setRecipeStats);
  }, [fridge]);

  const total = Object.keys(fridge).filter((id) => fridgeAvailable(fridge, id)).length;
  const imminent = imminentIds(fridge);
  const ready = recipeStats.items.filter((r) => r.full).length;
  const topRecipes = [...recipeStats.items].sort((a, b) => b.have / b.total - a.have / a.total).slice(0, 2);

  return (
    <section className="screen active">
      <div className="appbar"><h1>🥬 냉장고 레시피</h1></div>
      <div className="content">
        <div className="hero">
          <h2>🧊 오늘의 냉장고</h2>
          <p>재료 현황과 지금 가능한 요리를 한눈에</p>
          <div className="stats">
            <div className="stat"><b>{total}</b><span>보유 재료</span></div>
            <div className="stat"><b>{imminent.length}</b><span>유통기한 임박</span></div>
            <div className="stat"><b>{ready}</b><span>지금 가능한 요리</span></div>
          </div>
        </div>

        <div className="banner" onClick={() => go('shopping-sets')}>
          <span>🛒</span>
          <span className="txt">냉장고 재료가 부족해요! 추천 장보기 세트를 확인해 보세요</span>
          <span className="arrow">›</span>
        </div>

        <div className="section-title">유통기한 임박 재료 <a onClick={() => go('expiry-alerts')}>전체보기 ›</a></div>
        <div>
          {imminent.length ? imminent.map((id) => {
            const f = fridge[id];
            return (
              <Row key={id} emoji={f.emoji} name={f.name} meta={`${f.qtyLabel} · 냉장`}
                right={<span className="badge red">{f.expiry}</span>} onClick={() => tab('fridge')} />
            );
          }) : <p style={{ fontSize: 13, color: 'var(--sub)' }}>임박한 재료가 없어요 👍</p>}
        </div>

        <div className="section-title">오늘의 추천 레시피 <a onClick={() => tab('recipe-list')}>전체보기 ›</a></div>
        <div>
          {topRecipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} matchPct={Math.round((r.have / r.total) * 100)}
              extra={r.full
                ? <div className="meta" style={{ marginTop: 4, color: 'var(--green-dark)', fontWeight: 700 }}>재료 {r.have}/{r.total} 보유 — 지금 바로 가능</div>
                : <div className="meta" style={{ marginTop: 4 }}>재료 {r.have}/{r.total} 보유</div>}
              onClick={() => openRecipeDetail(r.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}
