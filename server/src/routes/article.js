import { Router } from "express"
import { parseArticle } from "../services/articleParser.js"
import { computeFastAnalysis, computeSlowAnalysis, saveTermsToVocabulary } from "../services/llmService.js"
import { ensureArticle, saveFastAnalysis, saveSlowAnalysis } from "../services/articleStore.js"
import { attachUser } from "../middleware/auth.js"

const router = Router()

// POST /api/article/parse — 원문 스크래핑만 담당한다(기능①). AI 추론
// (/api/article/analyze, /api/article/analyze/details)과 반드시 분리된
// 엔드포인트로 유지한다 — 하나로 합치면 스크래핑 지연과 LLM 추론 지연이
// 겹쳐 HTTP Timeout 위험이 커진다.
router.post("/parse", async (req, res) => {
  try {
    const { url } = req.body
    if (!url) throw new Error("url is required")
    const article = await parseArticle(url)
    res.json({ success: true, data: article })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

function validateParagraphs(paragraphs) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    throw new Error("paragraphs is required")
  }
}

// POST /api/article/analyze — parse 성공 후에만 호출한다(기능②). 리더뷰가
// 즉시 렌더링에 필요한 최소 데이터(문장 번역+3줄 요약)만 반환하는 fast lane —
// terms/insight/marketSentiment까지 기다리지 않아 응답이 더 빠르다.
router.post("/analyze", async (req, res) => {
  try {
    const { paragraphs, title, url } = req.body
    validateParagraphs(paragraphs)

    // url이 있으면 기사 단위 캐시를 먼저 확인한다 — 같은 기사를 다시 열어도
    // Claude를 재호출하지 않고 이전 분석 결과를 그대로 재사용한다.
    const article = url ? await ensureArticle(title, url) : null
    if (article?.fast_analysis) {
      return res.json({ success: true, data: article.fast_analysis })
    }

    const analysis = await computeFastAnalysis(paragraphs, title)
    if (article) await saveFastAnalysis(article.id, analysis)
    res.json({ success: true, data: analysis })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/article/analyze/details — fast lane과 병렬로 호출되는 slow lane.
// 판단 전까지 블라인드 처리되는 insight/marketSentiment와 단어장 자동 적재용
// terms를 반환한다. 로그인 여부와 무관하게 동작하되(attachUser는 막지 않음),
// 로그인 상태면 req.userId가 채워져 단어장 자동 적재까지 이어진다.
router.post("/analyze/details", attachUser, async (req, res) => {
  try {
    const { paragraphs, title, url } = req.body
    validateParagraphs(paragraphs)

    // fast lane과 동일하게 기사 단위 캐시를 먼저 확인한다. 캐시 히트여도
    // saveTermsToVocabulary는 그대로 호출한다 — 단어장은 사용자별 데이터라
    // 이 기사를 처음 읽는 사용자라면 여전히 적재돼야 하기 때문. 다만 이제
    // terms 문자열이 기사당 고정값이라, 같은 사용자가 재방문해도
    // appendVocabulary의 문자열 완전일치 dedup이 정확히 걸러낸다.
    const article = url ? await ensureArticle(title, url) : null
    let analysis = article?.slow_analysis ?? null
    if (!analysis) {
      analysis = await computeSlowAnalysis(paragraphs, title)
      if (article) await saveSlowAnalysis(article.id, analysis)
    }

    await saveTermsToVocabulary(analysis.terms, title, url, req.userId)
    res.json({ success: true, data: analysis })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
