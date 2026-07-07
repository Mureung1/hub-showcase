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
