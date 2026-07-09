import { useApp } from '../context/AppContext';

export default function MealPlan() {
  const { back, go, weekPlan, openMealShoppingList } = useApp();
  if (!weekPlan) return null;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>일주일 식단 루틴</h1></div>
      <div className="content">
        <div className="notice">
          ✅ 고르신 메뉴로 이번 주 식단을 짰어요 ·{' '}
          <a style={{ color: 'var(--green-dark)', fontWeight: 700, cursor: 'pointer' }} onClick={() => go('meal-plan-picker')}>🔄 메뉴 다시 고르기</a>
        </div>
        <div>
          {weekPlan.days.map((d) => (
            <div className="row" key={d.day}>
              <div className="day-tag">{d.day}</div>
              <div className="info">
                <div className="name">{d.recipe.name}{d.picked && <> <span className="badge green">내가 고른 메뉴 ⭐</span></>}</div>
                <div className="meta">{d.recipe.levelLabel} · {d.recipe.time}분</div>
              </div>
              <div className="right">{d.recipe.emoji}</div>
            </div>
          ))}
        </div>
        <div className="row">
          <div className="day-tag">일</div>
          <div className="info"><div className="name">냉장고 털이 요리</div><div className="meta">남은 재료 전부 소진!</div></div>
          <div className="right">🧹</div>
        </div>
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" onClick={openMealShoppingList}>이 식단 장보기 리스트 만들기</button>
      </div>
    </section>
  );
}
