import { Router } from "express"
import { explainTerms } from "../services/llmService.js"

const router = Router()

// GET /api/terms — today's investment-term mini glossary (fixed difficulty, screen 6).
router.get("/", async (_req, res) => {
  try {
    const terms = await explainTerms()
    res.json({ success: true, data: terms })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
