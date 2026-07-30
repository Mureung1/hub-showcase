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
  memo,
}) {
  return apiRequest("/api/decisions", {
    method: "POST",
    body: JSON.stringify({ url, title, summaryBullets, decision, marketSentiment, insight, memo: memo ?? null }),
  })
}

export async function updateDecisionMemo(id, memo) {
  return apiRequest(`/api/decisions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ memo }),
  })
}

export async function deleteDecisions(ids) {
  return apiRequest("/api/decisions", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  })
}
