import { Router } from 'express'
import { createLetter, getLetterByToken } from '../controllers/lettersController.js'

const router = Router()

router.post('/', createLetter)
router.get('/:token', getLetterByToken)

export default router
