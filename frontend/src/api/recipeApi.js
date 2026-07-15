import { apiRequest } from "./apiClient";

export function getRecipes(idToken) {
  return apiRequest("/api/recipes", { idToken });
}