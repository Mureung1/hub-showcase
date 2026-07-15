// 편지 라우트의 요청/응답 처리.
// 검증은 zod 스키마로, 실제 DB 작업은 서비스 레이어로 위임한다.
import { createLetterSchema } from '../schemas/letterSchema.js'
import { createLetter, listMyLetters } from '../services/lettersService.js'

export async function postLetter(req, res, next) {
  try {
    const data = createLetterSchema.parse(req.body)
    const letter = await createLetter(data)
    res.status(201).json(letter)
  } catch (err) {
    next(err)
  }
}

export async function getMyLetters(req, res, next) {
  try {
    const letters = await listMyLetters()
    res.json(letters)
  } catch (err) {
    next(err)
  }
}
