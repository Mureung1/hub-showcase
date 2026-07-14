import { Posting } from '@prisma/client'

export interface ICalendarProvider {
  sync(userId: string, posting: Posting): Promise<{ eventId: string }>
  unsync(userId: string, eventId: string): Promise<void>
  export(userId: string, postingIds?: string[]): Promise<string>
  getCalendars(userId: string): Promise<Array<{ id: string; name: string }>>
}

export class CalendarService {
  private provider: ICalendarProvider

  constructor(provider: ICalendarProvider) {
    this.provider = provider
  }

  async sync(userId: string, posting: Posting) {
    return this.provider.sync(userId, posting)
  }

  async unsync(userId: string, eventId: string) {
    return this.provider.unsync(userId, eventId)
  }

  async export(userId: string, postingIds?: string[]) {
    return this.provider.export(userId, postingIds)
  }

  async getCalendars(userId: string) {
    return this.provider.getCalendars(userId)
  }
}
