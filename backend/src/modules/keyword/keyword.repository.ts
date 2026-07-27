import { prisma } from '../../db/prisma.js'

export class KeywordRepository {
  createKeyword(guildId: string, userId: string, keyword: string) {
    return prisma.keyword.create({
      data: {
        guildId,
        userId,
        keyword,
      },
    })
  }

  deleteKeyword(guildId: string, userId: string, keyword: string) {
    return prisma.keyword.deleteMany({
      where: {
        guildId,
        userId,
        keyword,
      },
    })
  }

  deleteKeywordById(guildId: string, userId: string, id: number) {
    return prisma.keyword.deleteMany({
      where: {
        id,
        guildId,
        userId,
      },
    })
  }

  deleteKeywordsByIds(guildId: string, userId: string, ids: number[]) {
    return prisma.keyword.deleteMany({
      where: {
        id: {
          in: ids,
        },
        guildId,
        userId,
      },
    })
  }

  findUserKeywords(guildId: string, userId: string) {
    return prisma.keyword.findMany({
      where: {
        guildId,
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  findGuildKeywords(guildId: string) {
    return prisma.keyword.findMany({
      where: {
        guildId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }
}

export const keywordRepository = new KeywordRepository()
