import { Router } from "express"
import { readVocabulary } from "../services/vocabularyStore.js"

const router = Router()

// GET /api/vocabulary — 단어장 조회(기능④). 누적 저장소를 최신순으로 반환한다.
router.get("/", (_req, res) => {
  try {
    res.json({ success: true, data: { vocabulary: readVocabulary() } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
