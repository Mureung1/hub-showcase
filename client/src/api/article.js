import { apiRequest } from "./client.js"

export async function parseArticle(url) {
  return apiRequest("/api/article/parse", {
    method: "POST",
    body: JSON.stringify({ url }),
  })
}

// fast lane — 리더뷰가 즉시 렌더링에 필요로 하는 sentences/summaryBullets만 반환.
export async function analyzeArticle(paragraphs, title, url) {
  return apiRequest("/api/article/analyze", {
    method: "POST",
    body: JSON.stringify({ paragraphs, title, url }),
  })
}

// slow lane — 판단 전까지 블라인드 처리되는 insight/marketSentiment와 단어장
// 자동 적재용 terms. fast lane과 병렬로 호출해 백그라운드에서 준비해둔다.
export async function analyzeArticleDetails(paragraphs, title, url) {
  return apiRequest("/api/article/analyze/details", {
    method: "POST",
    body: JSON.stringify({ paragraphs, title, url }),
  })
}
