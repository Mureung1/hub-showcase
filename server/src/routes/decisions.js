import { Router } from "express"
import { readDecisions, appendDecision } from "../services/decisionStore.js"
import { requireAuth } from "../middleware/auth.js"

const router = Router()

// GET /api/decisions — 인사이트 노트 투자 판단 히스토리(기능③). 사용자별
// 데이터라 로그인이 필수다.
router.get("/", requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: { decisions: await readDecisions(req.userId) } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/decisions — 투자 판단 저장(기능③)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { url, title, summaryBullets, decision, marketSentiment, insight } = req.body
    if (!url || !title || !decision) {
      throw new Error("url, title, decision are required")
    }
    const saved = await appendDecision(req.userId, {
      url,
      title,
      summaryBullets: summaryBullets ?? [],
      decision,
      marketSentiment,
      insight,
    })
    res.json({ success: true, data: saved })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
