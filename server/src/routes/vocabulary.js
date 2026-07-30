import { Router } from "express"
import { readVocabulary, deleteVocabularyTerms } from "../services/vocabularyStore.js"
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

// DELETE /api/vocabulary — 단어 삭제(개별/날짜 그룹 공용). 단어 카드 하나를
// 지울 때는 ids에 단일 id를, 날짜 그룹 카드를 지울 때는 그 날짜에 속한 모든
// id를 넘긴다.
router.delete("/", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("ids must be a non-empty array")
    }
    const deleted = await deleteVocabularyTerms(req.userId, ids)
    res.json({ success: true, data: { deletedIds: deleted.map((row) => row.id) } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
