import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import RecipeCard from '../components/RecipeCard';

const CAN_MAKE_CHIPS = [
  { v: 'full', label: '✅ 100% 바로 가능' },
  { v: 'few',  label: '🧂 재료 몇개만 더 (핵심 재료 OK)' },
];

// GET /api/recipes?level= 에 전달되는 값
// - 'all'      : 전체
// - 'beginner' : 초보자
// - 'mid'      : 중급자
const LEVEL_CHIPS = [
  { v: 'all',      label: '난이도 전체' },
  { v: 'beginner', label: '🟢 초보자' },
  { v: 'mid',      label: '🟡 중급자' },
  { v: 'high',     label: '🔴 상급자' },
];

const CATEGORY_CHIPS = [
  { v: 'all', label: '전체메뉴' },
  { v: '반찬', label: '반찬' },
  { v: '국&찌개', label: '국&찌개' },
  { v: '일품', label: '일품' },
  { v: '밥/죽/스프', label: '밥/죽/스프' },
  { v: '후식', label: '디저트' },
];

export default function RecipeList() {
  const { fridge, openRecipeDetail, tab, go } = useApp();
  const [viewMode, setViewMode] = useState('can-make'); // 'can-make' | 'browse'
  const [match, setMatch] = useState('full');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');
  const [recipes, setRecipes] = useState({ items: [], total: 0 });

  // 뷰 모드가 변경될 때 필터 상태 동기화
  useEffect(() => {
    if (viewMode === 'can-make') {
      setMatch('full');
      setCategory('all');
    } else {
      setMatch('all');
    }
  }, [viewMode]);

  useEffect(() => {
    if (Object.keys(fridge).length) api.getRecipes({ filter: match, level, category }).then(setRecipes);
  }, [fridge, match, level, category]);

  return (
    <section className="screen active">
      <div className="appbar"><h1>레시피</h1></div>
      <div className="content">
        <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <div 
            style={{ flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 15, fontWeight: viewMode === 'can-make' ? 800 : 500, borderBottom: viewMode === 'can-make' ? '3px solid var(--green-dark)' : 'none', color: viewMode === 'can-make' ? 'var(--green-dark)' : 'var(--sub)', cursor: 'pointer' }}
            onClick={() => setViewMode('can-make')}
          >내 냉장고로 요리</div>
          <div 
            style={{ flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 15, fontWeight: viewMode === 'browse' ? 800 : 500, borderBottom: viewMode === 'browse' ? '3px solid var(--green-dark)' : 'none', color: viewMode === 'browse' ? 'var(--green-dark)' : 'var(--sub)', cursor: 'pointer' }}
            onClick={() => setViewMode('browse')}
          >전체 둘러보기</div>
        </div>

        {viewMode === 'can-make' && (
          <div className="chips" style={{ marginBottom: 12 }}>
            {CAN_MAKE_CHIPS.map((c) => (
              <span key={c.v} className={`chip${match === c.v ? ' on' : ''}`} onClick={() => setMatch(c.v)}>{c.label}</span>
            ))}
          </div>
        )}

        {viewMode === 'browse' && (
          <>
            <div className="chips" style={{ marginBottom: 6, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4 }}>
              {CATEGORY_CHIPS.map((c) => (
                <span key={c.v} className={`chip${category === c.v ? ' on' : ''}`} onClick={() => setCategory(c.v)}>{c.label}</span>
              ))}
            </div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {LEVEL_CHIPS.map((c) => (
                <span key={c.v} className={`chip${level === c.v ? ' on' : ''}`} onClick={() => setLevel(c.v)}>{c.label}</span>
              ))}
            </div>
          </>
        )}

        {viewMode === 'can-make' && (
          <div className="notice" style={{ marginTop: 0 }}>🔥 임박 재료를 쓰는 요리 우선 · <b>{recipes.total}</b>개 레시피</div>
        )}
        {viewMode === 'browse' && (
          <div className="notice" style={{ marginTop: 0 }}><b>{recipes.total}</b>개 레시피</div>
        )}

        <div>
          {recipes.items.map((r) => (
            <RecipeCard key={r.id} recipe={r} matchPct={Math.round((r.have / r.total) * 100)}
              extra={r.full
                ? <div className="meta" style={{ marginTop: 4, color: 'var(--green-dark)', fontWeight: 700 }}>재료 {r.have}/{r.total} 보유 — 바로 가능</div>
                : <div className="meta" style={{ marginTop: 4 }}>재료 {r.have}/{r.total} 보유 · {r.missing.join(', ')} 부족 (선택 재료)</div>}
              onClick={() => openRecipeDetail(r.id)} />
          ))}
        </div>

        {recipes.total > 0 && (
          <div className="notice" style={{ marginTop: 4 }}>
            원하는 요리가 없다면 재료를 더 채워보세요 ·{' '}
            <a style={{ color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer' }} onClick={() => tab('shopping-sets')}>장보기 세트 보기 ›</a>
          </div>
        )}

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
