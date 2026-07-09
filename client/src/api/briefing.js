import { apiRequest } from "./client"

/** GET /api/briefing — today's curated article (headline, summary, source link). */
export function getTodayBriefing() {
  return apiRequest("/api/briefing")
}
