import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) {
      const err = new Error('사용자를 찾을 수 없습니다.')
      err.status = 401
      return next(err)
    }
    res.json({ id: user.id, email: user.email, username: user.username })
  } catch (e) {
    next(e)
  }
})

export default router
