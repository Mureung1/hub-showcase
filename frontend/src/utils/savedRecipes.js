const SAVED_RECIPES_STORAGE_KEY = "todays-fridge.saved-recipes.v1";

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function isSavedRecipe(value) {
  return value
    && typeof value === "object"
    && typeof value.fingerprint === "string"
    && typeof value.name === "string";
}

export function readSavedRecipes(storage) {
  try {
    const raw = getStorage(storage)?.getItem(SAVED_RECIPES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedRecipe) : [];
  } catch {
    return [];
  }
}

export function isRecipeSaved(recipe, savedRecipes) {
  return Boolean(recipe?.fingerprint) && savedRecipes.some((savedRecipe) => savedRecipe.fingerprint === recipe.fingerprint);
}

function createSavedRecipeSnapshot(recipe) {
  const { id: _id, ...recipeSnapshot } = recipe;
  return {
    ...recipeSnapshot,
    savedAt: new Date().toISOString(),
  };
}

export function toggleSavedRecipe(recipe, storage) {
  if (!recipe?.fingerprint) return { saved: false, recipes: readSavedRecipes(storage) };

  const savedRecipes = readSavedRecipes(storage);
  const alreadySaved = isRecipeSaved(recipe, savedRecipes);
  const recipes = alreadySaved
    ? savedRecipes.filter((savedRecipe) => savedRecipe.fingerprint !== recipe.fingerprint)
    : [createSavedRecipeSnapshot(recipe), ...savedRecipes].slice(0, 50);

  try {
    getStorage(storage)?.setItem(SAVED_RECIPES_STORAGE_KEY, JSON.stringify(recipes));
  } catch {
    return { saved: alreadySaved, recipes: savedRecipes, persisted: false };
  }

  return { saved: !alreadySaved, recipes, persisted: true };
}

export function createShoppingSearchUrl(ingredientName) {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(String(ingredientName ?? "").trim())}`;
}
