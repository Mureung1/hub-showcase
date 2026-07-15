function normalizeName(name) {
  return name.trim().replaceAll(" ", "").toLowerCase();
}

export function getRecipeAvailability(recipe, ingredients) {
  const ownedNames = new Set(ingredients.map((ingredient) => normalizeName(ingredient.name)));
  const requiredIngredients = recipe.requiredIngredients ?? [];
  const ownedIngredients = requiredIngredients.filter((name) => ownedNames.has(normalizeName(name)));
  const missingIngredients = requiredIngredients.filter((name) => !ownedNames.has(normalizeName(name)));

  return {
    status: missingIngredients.length === 0 ? "available" : missingIngredients.length === 1 ? "oneMissing" : "shoppingNeeded",
    ownedIngredients,
    missingIngredients,
  };
}

const moodRules = {
  noFire: (recipe) => recipe.cookingMethod === "noFire" && recipe.effortLevel === "low" && recipe.cookingTime <= 10 && !recipe.isSpecial,
  quick: (recipe) => recipe.cookingMethod === "fire" && recipe.cookingTime <= 20 && !recipe.isSpecial,
  special: (recipe) => recipe.isSpecial,
};

function availabilityRank(status) {
  return { available: 0, oneMissing: 1, shoppingNeeded: 2 }[status] ?? 3;
}

export function getRecommendedRecipes({ recipes, ingredients, selectedMood, includeOneMissing = true }) {
  return recipes
    .filter(moodRules[selectedMood] ?? moodRules.quick)
    .map((recipe) => ({ recipe, availability: getRecipeAvailability(recipe, ingredients) }))
    .filter(({ availability }) => includeOneMissing || availability.status === "available")
    .sort((a, b) => {
      if (selectedMood === "special") return a.availability.missingIngredients.length - b.availability.missingIngredients.length || a.recipe.cookingTime - b.recipe.cookingTime;
      return availabilityRank(a.availability.status) - availabilityRank(b.availability.status) || a.recipe.cookingTime - b.recipe.cookingTime;
    });
}
