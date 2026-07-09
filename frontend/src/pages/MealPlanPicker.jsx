import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import RecipeCard from '../components/RecipeCard';

export default function MealPlanPicker() {
  const { back, pickedDishes, togglePick, buildMealPlan } = useApp();
  const [candidates, setCandidates] = useState([]);

  useEffect(() => { api.getMealPlanCandidates().then((r) => setCandidates(r.items)); }, []);

  const confirmLabel = pickedDishes.length === 2
    ? `🍽️ ${pickedDishes.map((id) => candidates.find((c) => c.id === id)?.name).join(' · ')}(으)로 식단 짜기`
    : `${2 - pickedDishes.length}개 더 고르면 식단을 만들 수 있어요`;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>이번 주 뭐 먹지?</h1></div>
      <div className="content">
        <div className="notice">🍽️ 이번 주 가장 먹고 싶은 메뉴 <b>2가지</b>를 골라주세요. 나머지 요일은 냉장고 재료로 자동으로 채워드려요.</div>
        <div>
          {candidates.map((r) => (
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
