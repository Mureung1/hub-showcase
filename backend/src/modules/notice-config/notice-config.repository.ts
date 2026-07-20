import { prisma } from '../../db/prisma.js'

export class NoticeConfigRepository {
  findByGuildId(guildId: string) {
    return prisma.noticeSite.findUnique({
      where: { guildId },
      include: {
        categories: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    })
  }
}

export const noticeConfigRepository = new NoticeConfigRepository()
