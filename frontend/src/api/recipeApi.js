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