import Badge from './Badge';

// 레시피 리스트/홈 추천/임박알림/식단고르기 화면에서 공통으로 쓰는 카드.
export default function RecipeCard({ recipe, matchPct, extra, pickCheck, onClick }) {
  return (
    <div className="card tap recipe-item" onClick={onClick}>
      <div className="recipe-card">
        <div className="thumb">{recipe.emoji}</div>
        <div className="info">
          <div className="name">
            {recipe.name}
            {recipe.imminentBadge && <> <Badge color="red">임박재료</Badge></>}
          </div>
          <div className="meta">
            {recipe.levelLabel} · {recipe.time}분
            {recipe.total && recipe.total <= 4 ? ` · 재료 ${recipe.total}개` : ''}
          </div>
          {matchPct != null && (
            <div className="match-bar"><i style={{ width: `${matchPct}%` }} /></div>
          )}
          {extra}
        </div>
        {pickCheck !== undefined && <div className="pick-check">{pickCheck ? '✅' : '➕'}</div>}
      </div>
    </div>
  );
}
