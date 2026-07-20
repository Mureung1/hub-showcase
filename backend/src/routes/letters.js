// /api/letters 라우트 정의. 실제 처리는 컨트롤러에 위임.
import { Router } from 'express'
import { getLetter, getMyLetters, postLetter } from '../controllers/lettersController.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const lettersRouter = Router()

// 편지 작성·조회는 전부 "누가 썼는지"가 있어야 의미가 있어 로그인을 요구한다.
lettersRouter.post('/', requireAuth, postLetter)
lettersRouter.get('/', requireAuth, getMyLetters)
lettersRouter.get('/:id', requireAuth, getLetter)
