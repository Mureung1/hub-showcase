import { Router } from 'express'
import { authRouter } from './auth.js'
import { testsRouter } from './tests.js'
import { roommateProfileRouter } from './roommateProfile.js'
import { roommateMatchingRouter } from './roommateMatching.js'
import { userProfileRouter } from './userProfile.js'

export const router = Router()

router.use('/auth', authRouter)
router.use('/tests', testsRouter)
router.use('/roommate-profile', roommateProfileRouter)
router.use('/matching', roommateMatchingRouter)
router.use('/users', userProfileRouter)

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})
