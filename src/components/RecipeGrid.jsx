import MenuCard from './MenuCard'

// 홈 화면에 레시피 카드 그리드(같은 <ol>+MenuCard 매핑)가 5번 반복되던 걸 하나로 합침.
// 섹션마다 다른 배지만 showTimeLabel/showMissingCount/cheapestId로 켜고 끈다.
function RecipeGrid({ recipes, cheapestId, likedIds, onToggleLike, showTimeLabel = false, showMissingCount = false, className = '' }) {
  return (
    <ol className={`mt-2 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1 ${className}`}>
      {recipes.map((recipe) => (
        <MenuCard
          key={recipe.id}
          to={`/recipe/${recipe.id}`}
          image={recipe.image}
          emoji={recipe.emoji}
          name={recipe.name}
          price={recipe.totalCost}
          priceSuffix="원"
          bestTag={cheapestId ? recipe.id === cheapestId : undefined}
          missingCount={showMissingCount ? recipe.missingCount : undefined}
          timeLabel={showTimeLabel ? `${recipe.cookTimeMinutes}분` : undefined}
          liked={likedIds.includes(recipe.id)}
          onToggleLike={() => onToggleLike(recipe.id)}
        />
      ))}
    </ol>
  )
}

export default RecipeGrid
