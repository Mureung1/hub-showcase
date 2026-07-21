import { apiRequest } from "./client.js"

export async function logArticleRead({ url, title, decisionId }) {
  return apiRequest("/api/article-reads", {
    method: "POST",
    body: JSON.stringify({ url, title, decisionId: decisionId ?? null }),
  })
}
