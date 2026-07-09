import { Router } from "express"
import { explainSentences } from "../services/llmService.js"

const router = Router()

// GET /api/sentences?level=basic|mid|high — key sentences + level-adjusted
// expression explanations for today's article (feature B).
router.get("/", async (req, res) => {
  const level = req.query.level ?? "basic"

  try {
    const sentences = await explainSentences(level)
    res.json({ success: true, data: sentences })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
