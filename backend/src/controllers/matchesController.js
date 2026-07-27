// /api/matches/:id 라우트의 요청/응답 처리.
import { matchStatusUpdateSchema } from '../schemas/matchSchema.js'
import { findMatchOwnedByUser, setStatus } from '../services/matchesService.js'
import { serializeMatch } from '../lib/serializeMatch.js'

export async function patchMatch(req, res, next) {
  try {
    const { status } = matchStatusUpdateSchema.parse(req.body)

    const owned = await findMatchOwnedByUser(req.params.id, req.userId)
    if (!owned) {
      return res.status(404).json({ error: '매칭을 찾을 수 없어요.' })
    }

    const updated = await setStatus(req.params.id, status)
    res.json(serializeMatch(updated))
  } catch (err) {
    next(err)
  }
}
