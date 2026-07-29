import { Router } from 'express'
import { createLetter, getLetterByToken, closeResponses } from '../controllers/lettersController.js'

const router = Router()

router.post('/', createLetter)
router.get('/:token', getLetterByToken)
router.patch('/:token/close-responses', closeResponses)

export default router
