import { apiRequest } from "./apiClient";

export function getRecipes(idToken) {
  return apiRequest("/api/recipes", { idToken });
}

export function structureRecipe(idToken, recipeInput) {
  return apiRequest("/api/ai/recipes/structure", {
    method: "POST",
    idToken,
    body: recipeInput,
  });
}

export function createRecipe(idToken, recipeRequest) {
  return apiRequest("/api/recipes", {
    method: "POST",
    idToken,
    body: recipeRequest,
  });
}

export function getRecipeDetail(idToken, recipeId) {
  return apiRequest(`/api/recipes/${recipeId}`, {
    method: "GET",
    idToken,
  });
}