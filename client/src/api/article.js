import { apiRequest } from "./client.js"

export async function parseArticle(url) {
  return apiRequest("/api/article/parse", {
    method: "POST",
    body: JSON.stringify({ url }),
  })
}

export async function analyzeArticle(paragraphs, title, url) {
  return apiRequest("/api/article/analyze", {
    method: "POST",
    body: JSON.stringify({ paragraphs, title, url }),
  })
}
