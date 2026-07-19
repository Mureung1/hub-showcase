import { Router } from "express"
import { getTodaysArticles } from "../services/dashboardCurationService.js"

const router = Router()

// GET /api/dashboard — 오늘의 핵심 외신 3개 (기능① 진입점).
router.get("/", async (_req, res) => {
  try {
    const articles = await getTodaysArticles()
    res.json({ success: true, data: { articles } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
