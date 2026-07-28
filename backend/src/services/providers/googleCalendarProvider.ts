import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { Posting, PrismaClient } from '@prisma/client'
import { ICalendarProvider } from '../calendarService.js'

const prisma = new PrismaClient()

export class GoogleCalendarProvider implements ICalendarProvider {
  private googleClientId: string
  private googleClientSecret: string
  private googleRedirectUri: string

  constructor() {
    this.googleClientId = process.env.GOOGLE_CLIENT_ID || ''
    this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    this.googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth-callback'
  }

  async sync(userId: string, posting: Posting): Promise<{ eventId: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true, googleRefreshToken: true }
    })

    if (!user?.googleAccessToken) {
      throw new Error('Google Calendar not connected')
    }

    const auth = new OAuth2Client(this.googleClientId, this.googleClientSecret, this.googleRedirectUri)
    auth.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    })

    const calendar = google.calendar({
      version: 'v3',
      auth: auth as any
    })

    // D-Day 계산 (마감일을 전날로 표시)
    const deadlineDate = posting.receptionEndDate
    if (!deadlineDate) {
      throw new Error('Posting has no receptionEndDate')
    }

    const formattedDate = deadlineDate.toISOString().split('T')[0]

    const event = {
      summary: `📋 ${posting.title}`,
      description: `🔗 ${posting.sourceUrl}`,
      start: {
        date: formattedDate,
        timeZone: 'Asia/Seoul'
      },
      end: {
        date: formattedDate,
        timeZone: 'Asia/Seoul'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'notification', minutes: 1440 }, // D-1
          { method: 'notification', minutes: 4320 } // D-3
        ]
      }
    }

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event as any
    })

    const eventId = result.data.id
    if (!eventId) {
      throw new Error('Failed to get eventId from Google Calendar')
    }

    return { eventId }
  }

  async unsync(userId: string, eventId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true, googleRefreshToken: true }
    })

    if (!user?.googleAccessToken) {
      throw new Error('Google Calendar not connected')
    }

    const auth = new OAuth2Client(this.googleClientId, this.googleClientSecret, this.googleRedirectUri)
    auth.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    })

    const calendar = google.calendar({
      version: 'v3',
      auth: auth as any
    })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    })
  }

  async export(userId: string, postingIds?: string[]): Promise<string> {
    throw new Error('iCalendar export not implemented yet')
  }

  async getCalendars(userId: string): Promise<Array<{ id: string; name: string }>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true, googleRefreshToken: true }
    })

    if (!user?.googleAccessToken) {
      throw new Error('Google Calendar not connected')
    }

    const auth = new OAuth2Client(this.googleClientId, this.googleClientSecret, this.googleRedirectUri)
    auth.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    })

    const calendar = google.calendar({
      version: 'v3',
      auth: auth as any
    })

    const result = await calendar.calendarList.list()
    return (
      result.data.items?.map((item) => ({
        id: item.id || '',
        name: item.summary || ''
      })) || []
    )
  }
}
