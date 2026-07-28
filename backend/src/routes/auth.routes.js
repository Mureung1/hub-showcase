import { Router } from 'express'
import { buildGoogleAuthUrl, fetchGoogleProfile } from '../lib/googleOAuth.js'
import { prisma } from '../lib/prisma.js'
import { signAccessToken, signInviteState, verifyInviteState } from '../lib/jwt.js'
import { googleAuthRateLimiter, googleCallbackRateLimiter } from '../middleware/rateLimit.js'

const router = Router()

router.get('/google', googleAuthRateLimiter, (req, res) => {
  const { state } = req.query
  res.redirect(buildGoogleAuthUrl(state ? signInviteState(state) : undefined))
})

router.get('/google/callback', googleCallbackRateLimiter, async (req, res, next) => {
  const { code } = req.query
  if (!code) {
    const err = new Error('유효하지 않은 code')
    err.status = 400
    return next(err)
  }

  let profile
  try {
    profile = await fetchGoogleProfile(code)
  } catch {
    const err = new Error('유효하지 않은 code')
    err.status = 400
    return next(err)
  }

  try {
    const user = await prisma.user.upsert({
      where: { googleId: profile.googleId },
      update: { email: profile.email, username: profile.username },
      create: profile,
    })
    const token = signAccessToken(user)

    const { state } = req.query
    let redirect = '/'
    if (state) {
      try {
        const subscriptionId = verifyInviteState(state)
        redirect = `/join/${encodeURIComponent(subscriptionId)}`
      } catch {
        redirect = '/'
      }
    }

    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback#token=${token}&redirect=${encodeURIComponent(redirect)}`)
  } catch (e) {
    next(e)
  }
})

export default router
