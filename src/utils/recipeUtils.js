import { getTagsForIngredientName } from "../../shared/ingredientTags.js";
import { getDaysRemaining, getIngredientDueDate } from "./expiration.js";
import { getPantryItemByName, getDefaultPantryAvailability } from "./pantry.js";

function normalizeName(name) {
  return name.trim().replaceAll(" ", "").toLowerCase();
}

export function getRecipeAvailability(recipe, ingredients, pantryAvailability = getDefaultPantryAvailability()) {
  const ownedNames = new Set(ingredients.map((ingredient) => normalizeName(ingredient.name)));
  const requiredIngredients = recipe.requiredIngredients ?? [];
  const isOwned = (name) => {
    const pantryItem = getPantryItemByName(name);
    return ownedNames.has(normalizeName(name)) || Boolean(pantryItem && pantryAvailability[pantryItem.id]);
  };
  const ownedIngredients = requiredIngredients.filter(isOwned);
  const missingIngredients = requiredIngredients.filter((name) => !isOwned(name));

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

function getExpiryScore(recipe, ingredients) {
  const requiredNames = new Set((recipe.requiredIngredients ?? []).map(normalizeName));
  const usedIngredients = ingredients.filter((ingredient) => requiredNames.has(normalizeName(ingredient.name)));
  const closestDays = usedIngredients.reduce((closest, ingredient) => {
    const days = getDaysRemaining(getIngredientDueDate(ingredient));
    return days === null ? closest : Math.min(closest, days);
  }, Number.POSITIVE_INFINITY);

  if (closestDays <= 2) return 25;
  if (closestDays <= 5) return 15;
  if (closestDays <= 7) return 8;
  return 0;
}

function getTimeScore(recipe, selectedMood) {
  if (selectedMood === "noFire") return recipe.cookingMethod === "noFire" && recipe.cookingTime <= 10 ? 15 : 5;
  if (selectedMood === "special") return recipe.isSpecial ? 15 : 5;
  if (recipe.cookingTime <= 15) return 15;
  if (recipe.cookingTime <= 20) return 10;
  return 5;
}

function getNutritionScore(recipe, ingredients) {
  const nutritionGroups = new Set();
  for (const ingredientName of recipe.requiredIngredients ?? []) {
    for (const tag of getTagsForIngredientName(ingredientName, ingredients)) {
      if (["nutrition:carb", "nutrition:protein", "nutrition:vegetable"].includes(tag)) nutritionGroups.add(tag);
    }
  }
  return Math.round((nutritionGroups.size / 3) * 20);
}

export function scoreRecipe(recipe, ingredients, selectedMood, pantryAvailability) {
  const availability = getRecipeAvailability(recipe, ingredients, pantryAvailability);
  const requiredCount = Math.max(1, (recipe.requiredIngredients ?? []).length);
  const availabilityScore = Math.round((availability.ownedIngredients.length / requiredCount) * 40);
  const scoreBreakdown = {
    availability: availabilityScore,
    expiry: getExpiryScore(recipe, ingredients),
    time: getTimeScore(recipe, selectedMood),
    nutrition: getNutritionScore(recipe, ingredients),
    instantPenalty: recipe.isInstant ? -15 : 0,
  };
  const score = Math.max(0, Math.min(100, Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0)));
  const scoreReasons = [
    `보유 재료 ${availability.ownedIngredients.length}/${requiredCount}개 활용`,
    scoreBreakdown.expiry > 0 ? "소비기한이 가까운 재료를 먼저 활용" : null,
    scoreBreakdown.nutrition >= 14 ? "여러 식품군을 고르게 구성" : "간단한 식품군 구성",
    scoreBreakdown.instantPenalty < 0 ? "인스턴트 메뉴 감점 반영" : null,
  ].filter(Boolean);

  return { availability, score, scoreBreakdown, scoreReasons };
}

export function getRecommendedRecipes({ recipes, ingredients, pantryAvailability, selectedMood, includeOneMissing = true }) {
  return recipes
    .filter(moodRules[selectedMood] ?? moodRules.quick)
    .map((recipe) => ({ recipe, ...scoreRecipe(recipe, ingredients, selectedMood, pantryAvailability) }))
    .filter(({ availability }) => includeOneMissing || availability.status === "available")
    .sort((a, b) => b.score - a.score
      || a.availability.missingIngredients.length - b.availability.missingIngredients.length
      || a.recipe.cookingTime - b.recipe.cookingTime);
}
