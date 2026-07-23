import { Router } from 'express'
import { suggestForLetter } from '../controllers/suggestController.js'

const router = Router()

router.post('/:token/suggest', suggestForLetter)

export default router
