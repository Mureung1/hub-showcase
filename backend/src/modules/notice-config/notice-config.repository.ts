import { prisma } from '../../db/prisma.js'

type CreateNoticeConfigInput = {
  guildId: string
  site: {
    name: string
    url: string
    listSelector: string
    titleSelector: string
    linkSelector: string
    dateSelector: string
    categorySelector: string
    categoryListSelector: string
  }
  categories: {
    name: string
    channelId: string
    roleName: string
    isActive: boolean
    roleId: string | null
  }[]
}

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

  createNoticeConfig(input: CreateNoticeConfigInput) {
    return prisma.$transaction(async (tx) => {
      return tx.noticeSite.create({
        data: {
          guildId: input.guildId,
          name: input.site.name,
          url: input.site.url,
          listSelector: input.site.listSelector,
          titleSelector: input.site.titleSelector,
          linkSelector: input.site.linkSelector,
          dateSelector: input.site.dateSelector,
          categorySelector: input.site.categorySelector,
          categoryListSelector: input.site.categoryListSelector,
          categories: {
            create: input.categories,
          },
        },
        include: {
          categories: {
            orderBy: {
              id: 'asc',
            },
          },
        },
      })
    })
  }

  deleteByGuildId(guildId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.keyword.deleteMany({
        where: { guildId },
      })

      return tx.noticeSite.delete({
        where: { guildId },
      })
    })
  }
}

export const noticeConfigRepository = new NoticeConfigRepository()
