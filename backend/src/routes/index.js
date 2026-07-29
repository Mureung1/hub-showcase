import { Router } from 'express'
import { authRouter } from './auth.js'
import { testsRouter } from './tests.js'
import { roommateProfileRouter } from './roommateProfile.js'
import { roommateMatchingRouter } from './roommateMatching.js'
import { datingMatchingRouter } from './datingMatching.js'
import { userProfileRouter } from './userProfile.js'
import { candidateChatRouter } from './candidateChatRoutes.js'
import { teamInviteRouter } from './teamInviteRoutes.js'
import { notificationRouter } from './notificationRoutes.js'
import { datingTeamRouter } from './datingTeamRoutes.js'
import { matchRequestRouter } from './matchRequestRoutes.js'
import { teamMatchChatRouter } from './teamMatchChatRoutes.js'
import { chatListRouter } from './chatListRoutes.js'

export const router = Router()

router.use('/auth', authRouter)
router.use('/tests', testsRouter)
router.use('/roommate-profile', roommateProfileRouter)
router.use('/matching', roommateMatchingRouter)
router.use('/matching', datingMatchingRouter)
router.use('/users', userProfileRouter)
router.use('/candidate-chat-rooms', candidateChatRouter)
router.use('/team-invites', teamInviteRouter)
router.use('/notifications', notificationRouter)
router.use('/dating-teams', datingTeamRouter)
router.use('/match-requests', matchRequestRouter)
router.use('/team-match-chat-rooms', teamMatchChatRouter)
router.use('/chat-rooms', chatListRouter)

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})
