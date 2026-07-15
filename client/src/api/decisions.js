import { apiRequest } from "./client.js"

export async function getDecisions() {
  const { decisions } = await apiRequest("/api/decisions")
  return decisions
}

export async function saveDecision({
  url,
  title,
  summaryBullets,
  decision,
  marketSentiment,
  insight,
}) {
  return apiRequest("/api/decisions", {
    method: "POST",
    body: JSON.stringify({ url, title, summaryBullets, decision, marketSentiment, insight }),
  })
}
