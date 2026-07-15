import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import RecipeCard from '../components/RecipeCard';

export default function MealPlanPicker() {
  const { back, pickedDishes, togglePick, buildMealPlan, weekPlanDifficulty, weekPlanType } = useApp();
  const [candidates, setCandidates] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => { api.getMealPlanCandidates().then((r) => setCandidates(r.items)); }, []);

  // 식사/반찬 카테고리 필터
  const isSideDish = (category) => ['반찬', '밑반찬', '김치/젓갈/장류'].includes(category);
  const isMeal = (category) => !['반찬', '밑반찬', '김치/젓갈/장류', '차/음료/술', '디저트', '과자', '후식', '빵', '양념/소스/잼'].includes(category);

  // 난이도 및 타입 필터 적용
  const diffFiltered = candidates.filter((r) => {
    if (weekPlanType === 'side' && !isSideDish(r.category)) return false;
    if (weekPlanType === 'meal' && !isMeal(r.category)) return false;
    if (weekPlanDifficulty && weekPlanDifficulty !== 'all' && r.level !== weekPlanDifficulty) return false;
    return true;
  });

  const filtered = query.trim()
    ? diffFiltered.filter((r) => r.name.includes(query.trim()))
    : diffFiltered.slice(0, 30); // 검색 전에는 상위 30개만 표시

  const isSide = weekPlanType === 'side';
  const targetPickCount = isSide ? 1 : 2;

  const confirmLabel = pickedDishes.length === targetPickCount
    ? `🍽️ ${pickedDishes.map((id) => candidates.find((c) => c.id === id)?.name).join(' · ')} 중심으로 조합하기`
    : `${targetPickCount - pickedDishes.length}개 더 고르면 세트를 만들 수 있어요`;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>{isSide ? '무슨 반찬을 할까요?' : '이번 주 뭐 먹지?'}</h1></div>
      <div className="content">
        <div className="notice">
          {isSide
            ? `🍽️ 가장 만들고 싶은 반찬 1가지를 골라주세요. 이 반찬을 중심으로 가장 효율적인 식자재 쉐어링 반찬 세트를 구성해 드려요.`
            : `🍽️ 이번 주 가장 먹고 싶은 메뉴 2가지를 골라주세요. 나머지 요일은 냉장고 재료로 자동으로 채워드려요.`
          }
        </div>
        <div style={{ padding: '0 0 12px' }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 먹고 싶은 요리 검색 (예: 김치찌개)"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 15, background: 'var(--bg-card)', color: 'var(--text)', boxSizing: 'border-box' }}
          />
          {!query && <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 6 }}>{weekPlanDifficulty !== 'all' ? '해당 난이도 전체 ' : '전체 '}{diffFiltered.length}개 레시피 · 검색하면 전체 결과가 표시돼요</div>}
        </div>
        <div>
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} pickCheck={pickedDishes.includes(r.id)} onClick={() => togglePick(r.id)} />
          ))}
        </div>
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" disabled={pickedDishes.length !== targetPickCount} onClick={buildMealPlan}>{confirmLabel}</button>
      </div>
    </section>
  );
}
