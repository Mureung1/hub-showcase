// 편지 라우트의 요청/응답 처리.
// 검증은 zod 스키마로, 실제 DB 작업은 서비스 레이어로 위임한다.
import { createLetterSchema } from '../schemas/letterSchema.js'
import { createLetter, getLetterById, listMyLetters } from '../services/lettersService.js'
import { tagLetter } from '../services/taggingService.js'

export async function postLetter(req, res, next) {
  try {
    const data = createLetterSchema.parse(req.body)
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
