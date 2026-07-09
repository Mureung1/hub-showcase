import { apiRequest } from "./client"

/** GET /api/sentences?level=basic|mid|high — key sentences + level-appropriate explanations. */
export function getSentences(level) {
  return apiRequest(`/api/sentences?level=${level}`)
}
