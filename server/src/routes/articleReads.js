import { Router } from "express"
import { appendArticleRead } from "../services/articleReadStore.js"
import { requireAuth } from "../middleware/auth.js"

const router = Router()

// POST /api/article-reads — 완독 이벤트 저장(기능③). 판단 여부와 무관하게
// 완독 시점에 호출되며, 판단으로 이어졌으면 decisionId를 함께 전달한다.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { url, title, decisionId } = req.body
    if (!url || !title) {
      throw new Error("url, title are required")
    }
    const saved = await appendArticleRead(req.userId, { url, title, decisionId })
    res.json({ success: true, data: saved })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
