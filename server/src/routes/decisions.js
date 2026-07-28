import { Router } from "express"
import { readDecisions, appendDecision, updateDecisionMemo } from "../services/decisionStore.js"
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
    const { url, title, summaryBullets, decision, marketSentiment, insight, memo } = req.body
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
      memo: memo ?? null,
    })
    res.json({ success: true, data: saved })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /api/decisions/:id — 판단 근거 한 줄 메모만 수정(재판단 insert와는
// 별개 경로). 카드 중복 생성 없이 기존 row의 memo 필드만 갱신한다.
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { memo } = req.body
    if (memo !== null && memo !== undefined && typeof memo !== "string") {
      throw new Error("memo must be a string or null")
    }
    const updated = await updateDecisionMemo(req.userId, req.params.id, memo ?? null)
    if (!updated) {
      res.status(404).json({ success: false, error: "decision not found" })
      return
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
