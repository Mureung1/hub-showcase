import { Router } from 'express'
import { buildGoogleAuthUrl, fetchGoogleProfile } from '../lib/googleOAuth.js'
import { prisma } from '../lib/prisma.js'
import { signAccessToken } from '../lib/jwt.js'

const router = Router()

router.get('/google', (req, res) => {
  res.redirect(buildGoogleAuthUrl(req.query.state))
})

router.get('/google/callback', async (req, res, next) => {
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
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback#token=${token}&joinedSubId=null`)
  } catch (e) {
    next(e)
  }
})

export default router
