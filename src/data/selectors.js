export function sortByCost(recipes) {
  return [...recipes].sort((a, b) => a.totalCost - b.totalCost)
}

export function getRecipesByCategory(recipes, categoryId) {
  return sortByCost(recipes.filter((recipe) => recipe.categoryId === categoryId))
}

// 카테고리에 subgroups가 있을 때, 하위 그룹별로 레시피를 묶어서 반환 (예: 라면 → 컵라면/봉지라면)
export function getRecipesBySubgroups(recipes, category) {
  const categoryRecipes = getRecipesByCategory(recipes, category.id)
  return category.subgroups.map((subgroup) => ({
    ...subgroup,
    recipes: categoryRecipes.filter((recipe) => recipe.subGroupId === subgroup.id),
  }))
}

// 냉장고 재료 칩을 카테고리별로 묶어서 반환 (예: 채소/고기·해산물/가공식품/면·곡물/기타) — FridgePage의 섹션 렌더링에 사용
export function getIngredientsByCategory(ingredients, categories) {
  return categories.map((category) => ({
    ...category,
    ingredients: ingredients.filter((ingredient) => ingredient.category === category.id),
  }))
}

// 재료가 matchNames 기준으로 레시피 몇 개에 쓰이는지 세어, 많이 쓰이는 재료가 앞에 오도록 정렬 — 섹션 안에서 스캔하기 쉽게
export function sortIngredientsByRecipeCount(ingredients, recipes) {
  const recipeCountByName = new Map()
  recipes.forEach((recipe) => {
    recipe.ingredients.forEach(({ name }) => {
      recipeCountByName.set(name, (recipeCountByName.get(name) ?? 0) + 1)
    })
  })

  function recipeCountFor(ingredient) {
    return ingredient.matchNames.reduce((sum, name) => sum + (recipeCountByName.get(name) ?? 0), 0)
  }

  return [...ingredients].sort((a, b) => recipeCountFor(b) - recipeCountFor(a))
}

// 냉장고에서 고른 재료(matchNames: 재료명 목록)가 1개 이상 들어가는 레시피만 골라 저렴한 순으로 반환
export function getRecipesByOwnedIngredients(recipes, matchNames) {
  if (matchNames.length === 0) return []
  return sortByCost(
    recipes.filter((recipe) =>
      recipe.ingredients.some((ingredient) => matchNames.includes(ingredient.name)),
    ),
  )
}

export function getCategoriesWithCheapest(categories, recipes, type) {
  return categories
    .filter((category) => category.type === type)
    .map((category) => {
      const categoryRecipes = getRecipesByCategory(recipes, category.id)
      return {
        ...category,
        cheapestRecipe: categoryRecipes[0] ?? null,
        recipeCount: categoryRecipes.length,
      }
    })
    .filter((category) => category.cheapestRecipe !== null)
    .sort((a, b) => a.cheapestRecipe.totalCost - b.cheapestRecipe.totalCost)
}
