import { noticeRepository } from './notice.repository.js'
import type { CreateNoticeInput } from './notice.repository.js'

export class NoticeService {
  countNoticesByNoticeSiteId(noticeSiteId: number) {
    return noticeRepository.countByNoticeSiteId(noticeSiteId)
  }

  async saveNewNotices(notices: CreateNoticeInput[]) {
    const existingHashKeys = await noticeRepository.findExistingHashKeys(
      notices.map((notice) => notice.hashKey),
    )
    const newNotices = notices.filter((notice) => !existingHashKeys.has(notice.hashKey))
    const result = await noticeRepository.createNotices(newNotices)

    return {
      newNotices,
      savedCount: result.count,
    }
  }
}

export const noticeService = new NoticeService()
