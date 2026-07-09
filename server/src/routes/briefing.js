import { Router } from "express"
import { getTodayArticle } from "../services/newsCollector.js"

const router = Router()

// GET /api/briefing — today's curated article for the user's watch list (feature A).
router.get("/", async (_req, res) => {
  try {
    const article = await getTodayArticle()
    res.json({ success: true, data: article })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
