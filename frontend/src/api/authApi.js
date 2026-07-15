import { apiRequest } from "./apiClient";

export function getCurrentUser(idToken) {
  return apiRequest("/api/auth/me", { idToken });
}