// /api/letters 라우트 정의. 실제 처리는 컨트롤러에 위임.
import { Router } from 'express'
import {
  getLetter,
  getLetterCount,
  getMyLetters,
  getMyThreads,
  getThreadLetter,
  postLetter,
  postThreadReply,
} from '../controllers/lettersController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { recommendationsRouter } from './recommendations.js'

export const lettersRouter = Router()

// 편지 작성·조회는 전부 "누가 썼는지"가 있어야 의미가 있어 로그인을 요구한다.
lettersRouter.post('/', requireAuth, postLetter)
lettersRouter.get('/', requireAuth, getMyLetters)
// /count, /threads, /threads/:id는 '/:id'보다 먼저 등록해야 한다 — 안 그러면 '/:id'가 이 경로들을
// id 파라미터로 먼저 먹어버린다(Express는 등록 순서대로 매칭).
lettersRouter.get('/count', requireAuth, getLetterCount)
lettersRouter.get('/threads', requireAuth, getMyThreads)
lettersRouter.get('/threads/:id', requireAuth, getThreadLetter)
lettersRouter.post('/threads/:id/reply', requireAuth, postThreadReply)
lettersRouter.get('/:id', requireAuth, getLetter)

// /api/letters/:id/recommendations, /current, /refresh
lettersRouter.use('/:id/recommendations', requireAuth, recommendationsRouter)
