// /api/admin 라우트의 요청/응답 처리. requireAuth + requireAdmin을 거친 뒤에만 도달한다.
import { setMatchableSchema } from '../schemas/adminSchema.js'
import {
  listFailedOrStaleTagging,
  getLetterTaggingInfo,
  setLetterMatchable,
  listFeedbackEntries,
} from '../services/adminService.js'
import { reprocessTagging } from '../services/taggingService.js'
import { MAX_TAGGING_ATTEMPTS } from '../config/matchingConfig.js'

export async function listFailedTagging(req, res, next) {
  try {
    res.json(await listFailedOrStaleTagging())
  } catch (err) {
    next(err)
  }
}

export async function reprocessTag(req, res, next) {
  try {
    const letter = await getLetterTaggingInfo(req.params.id)
    if (!letter) {
      return res.status(404).json({ error: '편지를 찾을 수 없어요.' })
    }
    if (letter.taggingAttempts >= MAX_TAGGING_ATTEMPTS) {
      return res.status(409).json({ error: '재시도 한도를 넘어서 자동 재처리 대상이 아니에요.' })
    }

    await reprocessTagging(letter.id)
    res.json(await getLetterTaggingInfo(letter.id))
  } catch (err) {
    next(err)
  }
}

export async function setMatchable(req, res, next) {
  try {
    const { is_matchable } = setMatchableSchema.parse(req.body)
    const letter = await getLetterTaggingInfo(req.params.id)
    if (!letter) {
      return res.status(404).json({ error: '편지를 찾을 수 없어요.' })
    }
    res.json(await setLetterMatchable(req.params.id, is_matchable))
  } catch (err) {
    next(err)
  }
}

export async function listFeedback(req, res, next) {
  try {
    res.json(await listFeedbackEntries())
  } catch (err) {
    next(err)
  }
}
