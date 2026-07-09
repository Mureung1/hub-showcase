import { apiRequest } from "./client"

/** GET /api/terms — today's investment-term mini glossary. */
export function getTerms() {
  return apiRequest("/api/terms")
}
