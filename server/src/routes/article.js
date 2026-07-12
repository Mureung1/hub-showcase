import { Router } from "express"
import { parseArticle } from "../services/articleParser.js"
import { analyzeArticle } from "../services/llmService.js"

const router = Router()

// POST /api/article/parse — 원문 스크래핑만 담당한다(기능①). AI 추론
// (/api/article/analyze)과 반드시 분리된 엔드포인트로 유지한다 — 하나로
// 합치면 스크래핑 지연과 LLM 추론 지연이 겹쳐 HTTP Timeout 위험이 커진다.
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

// POST /api/article/analyze — parse 성공 후에만 호출한다(기능②). 문단
// 텍스트를 받아 용어 해설·3줄 요약·주가 영향 해설을 반환한다.
router.post("/analyze", async (req, res) => {
  try {
    const { paragraphs } = req.body
    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
      throw new Error("paragraphs is required")
    }
    const analysis = await analyzeArticle(paragraphs)
    res.json({ success: true, data: analysis })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
