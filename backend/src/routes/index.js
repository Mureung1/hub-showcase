import { Router } from 'express'
import { authRouter } from './auth.js'
import { testsRouter } from './tests.js'

export const router = Router()

router.use('/auth', authRouter)
router.use('/tests', testsRouter)

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})
