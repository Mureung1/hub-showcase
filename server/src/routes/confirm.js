import { Router } from 'express'
import { confirmLetter } from '../controllers/confirmController.js'

const router = Router()

router.patch('/:token/confirm', confirmLetter)

export default router
