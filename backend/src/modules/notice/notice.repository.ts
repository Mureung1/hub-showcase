import { prisma } from '../../db/prisma.js'

export type CreateNoticeInput = {
  noticeSiteId: number
  categoryId: number
  hashKey: string
  title: string
  link: string
  date: Date
  normalizedLink: string
  firstSeenAt: Date
}

export class NoticeRepository {
  countByNoticeSiteId(noticeSiteId: number) {
    return prisma.notice.count({
      where: {
        noticeSiteId,
      },
    })
  }

  async findExistingHashKeys(hashKeys: string[]) {
    if (hashKeys.length === 0) {
      return new Set<string>()
    }

    const notices = await prisma.notice.findMany({
      where: {
        hashKey: {
          in: hashKeys,
        },
      },
      select: {
        hashKey: true,
      },
    })

    return new Set(notices.map((notice) => notice.hashKey))
  }

  createNotices(notices: CreateNoticeInput[]) {
    if (notices.length === 0) {
      return { count: 0 }
    }

    return prisma.notice.createMany({
      data: notices,
      skipDuplicates: true,
    })
  }
}

export const noticeRepository = new NoticeRepository()
