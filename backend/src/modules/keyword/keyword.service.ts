import { Prisma } from '@prisma/client'
import { AppError } from '../../shared/errors/app-error.js'
import { keywordRepository } from './keyword.repository.js'

const maxKeywordLength = 50
const prismaUniqueConstraintCode = 'P2002'

function normalizeKeyword(keyword: string) {
  return keyword.trim()
}

function assertValidKeyword(keyword: string) {
  if (!keyword) {
    throw new AppError(400, '키워드를 입력해주세요.')
  }

  if (keyword.length > maxKeywordLength) {
    throw new AppError(400, `키워드는 ${maxKeywordLength}자 이하로 입력해주세요.`)
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === prismaUniqueConstraintCode
}

export class KeywordService {
  async addKeyword(guildId: string, userId: string, keyword: string) {
    const normalizedKeyword = normalizeKeyword(keyword)
    assertValidKeyword(normalizedKeyword)

    try {
      await keywordRepository.createKeyword(guildId, userId, normalizedKeyword)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return {
          keyword: normalizedKeyword,
          created: false,
        }
      }

      throw error
    }

    return {
      keyword: normalizedKeyword,
      created: true,
    }
  }

  async removeKeyword(guildId: string, userId: string, keyword: string) {
    const normalizedKeyword = normalizeKeyword(keyword)
    assertValidKeyword(normalizedKeyword)
    const result = await keywordRepository.deleteKeyword(guildId, userId, normalizedKeyword)

    return {
      keyword: normalizedKeyword,
      deleted: result.count > 0,
    }
  }

  async removeKeywordById(guildId: string, userId: string, id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, '유효하지 않은 키워드 ID입니다.')
    }

    const result = await keywordRepository.deleteKeywordById(guildId, userId, id)

    return {
      deleted: result.count > 0,
    }
  }

  async removeKeywordsByIds(guildId: string, userId: string, ids: number[]) {
    const uniqueIds = Array.from(new Set(ids))

    if (uniqueIds.length === 0 || uniqueIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new AppError(400, '유효하지 않은 키워드 ID가 포함되어 있습니다.')
    }

    const result = await keywordRepository.deleteKeywordsByIds(guildId, userId, uniqueIds)

    return {
      deletedCount: result.count,
    }
  }

  async listKeywords(guildId: string, userId: string) {
    return keywordRepository.findUserKeywords(guildId, userId)
  }

  async findNoticeKeywordMatches(guildId: string, title: string) {
    const keywords = await keywordRepository.findGuildKeywords(guildId)
    const normalizedTitle = title.toLowerCase()
    const matchesByUserId = new Map<string, Set<string>>()

    for (const keyword of keywords) {
      if (!normalizedTitle.includes(keyword.keyword.toLowerCase())) {
        continue
      }

      const matchedKeywords = matchesByUserId.get(keyword.userId) ?? new Set<string>()

      matchedKeywords.add(keyword.keyword)
      matchesByUserId.set(keyword.userId, matchedKeywords)
    }

    return Array.from(matchesByUserId.entries()).map(([userId, matchedKeywords]) => ({
      userId,
      matchedKeywords: Array.from(matchedKeywords),
    }))
  }
}

export const keywordService = new KeywordService()
