// /api/matches 라우트의 요청/응답 처리.
import { matchStatusUpdateSchema } from '../schemas/matchSchema.js'
import { replyLetterSchema } from '../schemas/letterSchema.js'
import {
  findMatchOwnedByUser,
  listMatchesForAuthor,
  setStatus,
  replyToMatch,
} from '../services/matchesService.js'
import { serializeMatch, serializeMatchSummary } from '../lib/serializeMatch.js'

// 저장소 "받은 편지" 탭(T11) 목록.
export async function getMyMatches(req, res, next) {
  try {
    const matches = await listMatchesForAuthor(req.userId)
    res.json(matches.map(serializeMatchSummary))
  } catch (err) {
    next(err)
  }
}

// 저장소 "받은 편지" 상세. 스쳐 지나간(dismissed/expired) 편지는 프로토타입 때부터 전체 내용을
// 다시 보여주지 않는 원칙이라, 목록과 같은 404로 응답해 상세 접근 자체를 막는다.
export async function getMatch(req, res, next) {
  try {
    const match = await findMatchOwnedByUser(req.params.id, req.userId)
    if (!match || ['dismissed', 'expired'].includes(match.status)) {
      return res.status(404).json({ error: '편지를 찾을 수 없어요.' })
    }
    res.json(serializeMatchSummary(match))
  } catch (err) {
    next(err)
  }
}

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

export async function postReply(req, res, next) {
  try {
    const data = replyLetterSchema.parse(req.body)
    const result = await replyToMatch({ matchId: req.params.matchId, userId: req.userId, ...data })

    if (result.notFound) {
      return res.status(404).json({ error: '매칭을 찾을 수 없어요.' })
    }
    if (result.alreadyResolved) {
      return res.status(409).json({ error: '이미 처리된 추천이에요.' })
    }
    res.status(201).json(result.reply)
  } catch (err) {
    next(err)
  }
}
