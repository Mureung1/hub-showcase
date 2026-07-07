export function sortByCost(recipes) {
  return [...recipes].sort((a, b) => a.totalCost - b.totalCost)
}

export function getRecipesByCategory(recipes, categoryId) {
  return sortByCost(recipes.filter((recipe) => recipe.categoryId === categoryId))
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
