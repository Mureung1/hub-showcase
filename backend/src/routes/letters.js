// /api/letters 라우트 정의. 실제 처리는 컨트롤러에 위임.
import { Router } from 'express'
import { getMyLetters, postLetter } from '../controllers/lettersController.js'

export const lettersRouter = Router()

lettersRouter.post('/', postLetter)
lettersRouter.get('/', getMyLetters)
