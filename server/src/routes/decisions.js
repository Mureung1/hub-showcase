import { Router } from "express"
import { readDecisions, appendDecision } from "../services/decisionStore.js"

const router = Router()

// GET /api/decisions — 마이페이지 투자 판단 히스토리(기능③)
router.get("/", (_req, res) => {
  try {
    res.json({ success: true, data: { decisions: readDecisions() } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/decisions — 투자 판단 저장(기능③)
router.post("/", (req, res) => {
  try {
    const { url, title, summaryBullets, decision, marketSentiment, insight } = req.body
    if (!url || !title || !decision) {
      throw new Error("url, title, decision are required")
    }
    const saved = appendDecision({
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
