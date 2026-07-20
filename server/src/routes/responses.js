import { Router } from 'express'
import { createResponse, getResponsesByToken } from '../controllers/responsesController.js'

const router = Router()

router.post('/:token/responses', createResponse)
router.get('/:token/responses', getResponsesByToken)

export default router