import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import RecipeCard from '../components/RecipeCard';

export default function MealPlanPicker() {
  const { back, pickedDishes, togglePick, buildMealPlan } = useApp();
  const [candidates, setCandidates] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => { api.getMealPlanCandidates().then((r) => setCandidates(r.items)); }, []);

  const filtered = query.trim()
    ? candidates.filter((r) => r.name.includes(query.trim()))
    : candidates.slice(0, 30); // 검색 전에는 상위 30개만 표시

  const confirmLabel = pickedDishes.length === 2
    ? `🍽️ ${pickedDishes.map((id) => candidates.find((c) => c.id === id)?.name).join(' · ')}(으)로 식단 짜기`
    : `${2 - pickedDishes.length}개 더 고르면 식단을 만들 수 있어요`;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>이번 주 뭐 먹지?</h1></div>
      <div className="content">
        <div className="notice">🍽️ 이번 주 가장 먹고 싶은 메뉴 <b>2가지</b>를 골라주세요. 나머지 요일은 냉장고 재료로 자동으로 채워드려요.</div>
        <div style={{ padding: '0 0 12px' }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 먹고 싶은 요리 검색 (예: 김치찌개)"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 15, background: 'var(--bg-card)', color: 'var(--text)', boxSizing: 'border-box' }}
          />
          {!query && <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 6 }}>전체 {candidates.length}개 레시피 · 검색하면 전체 결과가 표시돼요</div>}
        </div>
        <div>
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} pickCheck={pickedDishes.includes(r.id)} onClick={() => togglePick(r.id)} />
          ))}
        </div>
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" disabled={pickedDishes.length !== 2} onClick={buildMealPlan}>{confirmLabel}</button>
      </div>
    </section>
  );
}
