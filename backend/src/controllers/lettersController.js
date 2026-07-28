// 편지 라우트의 요청/응답 처리.
// 검증은 zod 스키마로, 실제 DB 작업은 서비스 레이어로 위임한다.
import { createLetterSchema } from '../schemas/letterSchema.js'
import {
  createLetter,
  getLetterById,
  getThreadLetterForUser,
  hasLetterToday,
  listMyLetters,
  listThreadLettersForUser,
} from '../services/lettersService.js'
import { findUnresolvedMatchForAuthor } from '../services/matchesService.js'
import { tagLetter } from '../services/taggingService.js'

export async function postLetter(req, res, next) {
  try {
    const data = createLetterSchema.parse(req.body)

    // 하루 1편 제한 + 미해결 추천 시 차단 (docs/plan.md 서비스 규칙, 배포 직전에 다루기로 미뤄둔 항목)
    const [todayLetter, unresolvedMatch] = await Promise.all([
      hasLetterToday(req.userId),
      findUnresolvedMatchForAuthor(req.userId),
    ])
    if (todayLetter) {
      return res
        .status(409)
        .json({ error: '오늘은 이미 편지를 보냈어요. 내일 다시 써주세요.', reason_code: 'daily_limit' })
    }
    if (unresolvedMatch) {
      return res.status(409).json({
        error: '받은 추천 편지에 답장하거나 스쳐 가기를 먼저 해주세요.',
        reason_code: 'unresolved_recommendation',
      })
    }

    const letter = await createLetter({ ...data, authorId: req.userId })

    // 태깅은 응답 전에 동기로 처리하되(스펙 §6), 실패해도 편지 저장 자체는 이미 끝난 뒤라
    // 별도 try로 감싸서 201 응답에 영향을 주지 않게 한다. tagLetter 자체도 내부에서
    // 모든 실패를 삼키고 taggingStatus='failed'로 남기므로 여기서 걸리는 건 방어적 안전장치다.
    try {
      await tagLetter(letter.id)
    } catch (err) {
      console.error('[postLetter] 태깅 처리 중 예상치 못한 오류:', err.message)
    }

    res.status(201).json(letter)
  } catch (err) {
    next(err)
  }
}

export async function getMyLetters(req, res, next) {
  try {
    const letters = await listMyLetters(req.userId)
    res.json(letters)
  } catch (err) {
    next(err)
  }
}

export async function getLetter(req, res, next) {
  try {
    const letter = await getLetterById(req.params.id, req.userId)
    if (!letter) {
      return res.status(404).json({ error: '편지를 찾을 수 없어요.' })
    }
    res.json(letter)
  } catch (err) {
    next(err)
  }
}

// 8시간 배달 지연(E2)이 아직 구현 전이라 지금은 항상 'active'다. E2가 붙으면 여기서
// 지연 경과 여부에 따라 'sending'/'active'를 나눠 반환하도록 바꾸면 된다.
function serializeThreadLetter(letter) {
  return {
    letter_id: letter.id,
    thread_id: letter.threadId,
    title: letter.title,
    preview: `${letter.content.slice(0, 40)}…`,
    body: letter.content,
    created_at: letter.createdAt,
    status: 'active',
  }
}

export async function getMyThreads(req, res, next) {
  try {
    const letters = await listThreadLettersForUser(req.userId)
    res.json(letters.map(serializeThreadLetter))
  } catch (err) {
    next(err)
  }
}

export async function getThreadLetter(req, res, next) {
  try {
    const letter = await getThreadLetterForUser(req.params.id, req.userId)
    if (!letter) {
      return res.status(404).json({ error: '편지를 찾을 수 없어요.' })
    }
    res.json(serializeThreadLetter(letter))
  } catch (err) {
    next(err)
  }
}
