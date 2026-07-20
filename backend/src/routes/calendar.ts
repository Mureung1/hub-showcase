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

    console.log('📝 Google OAuth 처리 시작', {
      code: code.substring(0, 20) + '...',
      clientId: googleClientId?.substring(0, 20),
      redirectUri: googleRedirectUri
    })

    const { tokens } = await oauth2Client.getToken(code)
    const accessToken = tokens.access_token
    const refreshToken = tokens.refresh_token

    console.log('✅ 토큰 교환 성공', {
      accessToken: accessToken?.substring(0, 20) + '...',
      hasRefreshToken: !!refreshToken
    })

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

    console.log('💾 사용자 Google 토큰 저장 완료')
    res.json({ success: true })
  } catch (error) {
    console.error('❌ Google OAuth callback error:', error instanceof Error ? error.message : error)
    if (error instanceof Error) {
      console.error('상세:', error.stack)
    }
    res.status(400).json({
      error: 'Failed to connect Google Calendar',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
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

    // 마감일 검증: 오늘 이후인지 확인
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadline = new Date(posting.receptionEndDate)
    deadline.setHours(0, 0, 0, 0)

    console.log('📅 마감일 검증:', {
      postingId,
      deadline: deadline.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0],
      isPast: deadline < today
    })

    if (deadline < today) {
      console.log('⏰ 마감일이 과거이므로 Google Calendar 동기화 스킵')
      return res.json({
        success: true,
        eventId: null,
        message: 'Posting deadline is in the past, skipped Google Calendar sync'
      })
    }

    const result = await calendarService.sync(req.userId!, posting)
    console.log('✅ Google Calendar 동기화 완료:', result.eventId)
    res.json({ success: true, eventId: result.eventId })
  } catch (error) {
    console.error('❌ Calendar sync error:', error instanceof Error ? error.message : error)
    res.status(400).json({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
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
