import { Router } from "express"
import { readVocabulary } from "../services/vocabularyStore.js"
import { requireAuth } from "../middleware/auth.js"

const router = Router()

// GET /api/vocabulary — 단어장 조회(기능④). 사용자별 데이터라 로그인이
// 필수다. 누적 저장소를 최신순으로 반환한다.
router.get("/", requireAuth, async (req, res) => {
  try {
    res.json({ success: true, data: { vocabulary: await readVocabulary(req.userId) } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
