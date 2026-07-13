import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { PrismaClient } from '@prisma/client'
import { verifyAuth, AuthRequest } from '../middleware/auth'
import { CalendarService } from '../services/calendarService'
import { GoogleCalendarProvider } from '../services/providers/googleCalendarProvider'

const prisma = new PrismaClient()

const router = Router()
const googleCalendarProvider = new GoogleCalendarProvider()
const calendarService = new CalendarService(googleCalendarProvider)

// POST /api/calendar/oauth-callback
// Google OAuth 콜백 — 액세스 토큰 저장
router.post('/oauth-callback', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' })
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
    const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth-callback'

    if (!googleClientId || !googleClientSecret) {
      return res.status(500).json({ error: 'Google OAuth not configured' })
    }

    const oauth2Client = new OAuth2Client(googleClientId, googleClientSecret, googleRedirectUri)

    const { tokens } = await oauth2Client.getToken(code)
    const accessToken = tokens.access_token
    const refreshToken = tokens.refresh_token

    if (!accessToken) {
      return res.status(400).json({ error: 'Failed to get access token' })
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken || null,
        googleConnectedAt: new Date()
      }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    res.status(400).json({ error: 'Failed to connect Google Calendar' })
  }
})

// POST /api/calendar/sync
// 공고 → Google Calendar 동기화
router.post('/sync', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { postingId } = req.body
    if (!postingId) {
      return res.status(400).json({ error: 'postingId required' })
    }

    const posting = await prisma.posting.findUnique({
      where: { id: postingId }
    })

    if (!posting) {
      return res.status(404).json({ error: 'Posting not found' })
    }

    const result = await calendarService.sync(req.userId!, posting)
    res.json({ success: true, eventId: result.eventId })
  } catch (error) {
    console.error('Calendar sync error:', error)
    res.status(400).json({ error: 'Sync failed' })
  }
})

// DELETE /api/calendar/events/:eventId
// Google Calendar에서 삭제
router.delete('/events/:eventId', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.params

    await calendarService.unsync(req.userId!, eventId)
    res.json({ success: true })
  } catch (error) {
    console.error('Calendar delete error:', error)
    res.status(400).json({ error: 'Delete failed' })
  }
})

// GET /api/calendar/status
// Google Calendar 연동 상태
router.get('/status', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        googleConnectedAt: true,
        email: true
      }
    })

    res.json({
      connected: !!user?.googleConnectedAt,
      email: user?.email,
      connectedAt: user?.googleConnectedAt
    })
  } catch (error) {
    console.error('Calendar status error:', error)
    res.status(500).json({ error: 'Failed to get calendar status' })
  }
})

export default router
