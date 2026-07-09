import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import RecipeCard from '../components/RecipeCard';

const MATCH_CHIPS = [
  { v: 'all', label: '전체' },
  { v: 'full', label: '✅ 바로 가능' },
  { v: 'few', label: '🧂 적은 재료 OK' },
];
const LEVEL_CHIPS = [
  { v: 'all', label: '난이도 전체' },
  { v: 'beginner', label: '🟢 초보자' },
  { v: 'mid', label: '🟡 중급자' },
  { v: 'high', label: '🔴 상급자' },
];

export default function RecipeList() {
  const { fridge, openRecipeDetail, tab, go } = useApp();
  const [match, setMatch] = useState('all');
  const [level, setLevel] = useState('all');
  const [recipes, setRecipes] = useState({ items: [], total: 0 });

  useEffect(() => {
    if (Object.keys(fridge).length) api.getRecipes({ filter: match, level }).then(setRecipes);
  }, [fridge, match, level]);

  return (
    <section className="screen active">
      <div className="appbar"><h1>레시피</h1></div>
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
        <div className="notice">🔥 임박 재료를 쓰는 요리 우선 · <b>{recipes.total}</b>개 레시피</div>

        <div>
          {recipes.items.map((r) => (
            <RecipeCard key={r.id} recipe={r} matchPct={Math.round((r.have / r.total) * 100)}
              extra={r.full
                ? <div className="meta" style={{ marginTop: 4, color: 'var(--green-dark)', fontWeight: 700 }}>재료 {r.have}/{r.total} 보유 — 바로 가능</div>
                : <div className="meta" style={{ marginTop: 4 }}>재료 {r.have}/{r.total} 보유 · {r.missing.join(', ')} 부족 (선택 재료)</div>}
              onClick={() => openRecipeDetail(r.id)} />
          ))}
        </div>

        <div className="notice" style={{ marginTop: 4 }}>
          🚫 핵심 재료가 없는 레시피 <b>3개</b>(된장찌개 · 알리오 올리오 · 부대찌개)는 추천에서 제외했어요 ·{' '}
          <a style={{ color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer' }} onClick={() => tab('shopping-sets')}>장보기 세트 보기 ›</a>
        </div>

        {recipes.total === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <div style={{ fontSize: 40 }}>🤔</div>
            <p style={{ fontSize: 14.5, fontWeight: 800, marginTop: 10 }}>조건에 맞는 레시피가 없어요</p>
            <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 6 }}>필터를 바꾸거나, 한 주 식단을 통째로 받아보세요</p>
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => go('meal-plan-picker')}>📅 일주일 식단 루틴 보기</button>
          </div>
        )}
      </div>
    </section>
  );
}
