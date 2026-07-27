import { AppError } from '../../shared/errors/app-error.js'
import { logger } from '../../shared/logger/logger.js'
import { crawlNotices } from '../crawling/index.js'
import { toNoticePreview } from '../crawling/notice-normalizer.js'
import { discordService, getDefaultIrisRoleName } from '../discord/discord.service.js'
import { noticeConfigRepository } from './notice-config.repository.js'
import type {
  SaveNoticeConfigBody,
  TestCrawlBody,
  UpdateNoticeCategoriesBody,
} from './notice-config.schemas.js'

type PreparedNoticeCategory = {
  name: string
  channelId: string
  roleName: string
  isActive: boolean
  roleId: string | null
}

function assertActiveCategoriesHaveRoles(categories: PreparedNoticeCategory[]) {
  const invalidCategory = categories.find((category) => category.isActive && !category.roleId)

  if (invalidCategory) {
    throw new AppError(500, `Active category must have a Discord role: ${invalidCategory.name}`)
  }
}

export class NoticeConfigService {
  async testCrawlNoticeConfig(_guildId: string, body: TestCrawlBody) {
    const result = await crawlNotices(body)

    return {
      ...result,
      notices: toNoticePreview(result.notices),
    }
  }

  private async prepareCategoriesWithRoles(guildId: string, categories: SaveNoticeConfigBody['categories']) {
    const createdRoleIds: string[] = []
    const preparedCategories: PreparedNoticeCategory[] = []

    try {
      for (const category of categories) {
        await discordService.validateTextChannel(guildId, category.channelId)

        const roleName = category.roleName?.trim() || getDefaultIrisRoleName(category.name)

        if (!category.isActive) {
          preparedCategories.push({
            name: category.name,
            channelId: category.channelId,
            roleName,
            isActive: category.isActive,
            roleId: null,
          })

          continue
        }

        const role = await discordService.createRole(guildId, roleName)

        createdRoleIds.push(role.roleId)

        preparedCategories.push({
          name: category.name,
          channelId: category.channelId,
          roleName: role.roleName,
          isActive: category.isActive,
          roleId: role.roleId,
        })
      }

      return {
        categories: preparedCategories,
        createdRoleIds,
      }
    } catch (error) {
      await Promise.allSettled(createdRoleIds.map((roleId) => discordService.deleteRole(guildId, roleId)))

      throw error
    }
  }

  private cleanupRoles(guildId: string, roleIds: string[]) {
    void Promise.allSettled(roleIds.map((roleId) => discordService.deleteRole(guildId, roleId))).then((results) => {
      const failedCount = results.filter((result) => result.status === 'rejected').length

      if (failedCount > 0) {
        logger.warn('Failed to cleanup Discord roles', {
          guildId,
          failedCount,
        })
      }
    })
  }

  async saveNoticeConfig(guildId: string, body: SaveNoticeConfigBody) {
    const existingNoticeSite = await noticeConfigRepository.findByGuildId(guildId)

    if (existingNoticeSite) {
      throw new AppError(409, 'Notice config already exists')
    }

    const { categories, createdRoleIds } = await this.prepareCategoriesWithRoles(guildId, body.categories)
    assertActiveCategoriesHaveRoles(categories)

    try {
      await noticeConfigRepository.createNoticeConfig({
        guildId,
        site: body.site,
        categories,
      })
    } catch (error) {
      await Promise.allSettled(createdRoleIds.map((roleId) => discordService.deleteRole(guildId, roleId)))

      throw error
    }

    return {
      message: '공지 사이트 설정이 완료되었습니다.',
    }
  }

  async getNoticeConfig(guildId: string) {
    const noticeSite = await noticeConfigRepository.findByGuildId(guildId)

    if (!noticeSite) {
      throw new AppError(404, 'Notice config not found')
    }

    return {
      site: {
        name: noticeSite.name,
        url: noticeSite.url,
        listSelector: noticeSite.listSelector,
        titleSelector: noticeSite.titleSelector,
        linkSelector: noticeSite.linkSelector,
        dateSelector: noticeSite.dateSelector,
        categorySelector: noticeSite.categorySelector,
        categoryListSelector: noticeSite.categoryListSelector,
      },
      categories: noticeSite.categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        channelId: category.channelId,
        roleId: category.roleId,
        roleName: category.roleName,
        isActive: category.isActive,
      })),
    }
  }

  async updateNoticeCategories(guildId: string, body: UpdateNoticeCategoriesBody) {
    const noticeSite = await noticeConfigRepository.findByGuildId(guildId)

    if (!noticeSite) {
      throw new AppError(404, 'Notice config not found')
    }

    const categoryIds = body.categories.map((category) => category.categoryId)
    const uniqueCategoryIds = new Set(categoryIds)

    if (uniqueCategoryIds.size !== categoryIds.length) {
      throw new AppError(400, 'Duplicate category id')
    }

    const existingCategories = await noticeConfigRepository.findCategoriesByNoticeSiteId(
      noticeSite.id,
      categoryIds,
    )

    if (existingCategories.length !== categoryIds.length) {
      throw new AppError(404, 'Notice category not found')
    }

    const existingCategoryMap = new Map(
      existingCategories.map((category) => [category.id, category]),
    )
    const updatedCategories = []

    for (const category of body.categories) {
      const existingCategory = existingCategoryMap.get(category.categoryId)

      if (!existingCategory) {
        throw new AppError(404, 'Notice category not found')
      }

      await discordService.validateTextChannel(guildId, category.channelId)

      const roleName = category.roleName?.trim() || existingCategory.roleName
      let roleId = existingCategory.roleId
      let finalRoleName = roleName

      if (!category.isActive) {
        if (roleId) {
          await discordService.deleteRole(guildId, roleId)
        }

        roleId = null
      } else if (!roleId) {
        const role = await discordService.createRole(guildId, roleName)

        roleId = role.roleId
        finalRoleName = role.roleName
      } else if (roleName !== existingCategory.roleName) {
        const role = await discordService.updateRoleName(guildId, roleId, roleName)

        roleId = role.roleId
        finalRoleName = role.roleName
      }

      updatedCategories.push({
        categoryId: category.categoryId,
        name: existingCategory.name,
        channelId: category.channelId,
        roleName: finalRoleName,
        isActive: category.isActive,
        roleId,
      })
    }

    assertActiveCategoriesHaveRoles(
      updatedCategories.map((category) => ({
        name: category.name,
        channelId: category.channelId,
        roleName: category.roleName,
        isActive: category.isActive,
        roleId: category.roleId,
      })),
    )

    const categories = await noticeConfigRepository.updateNoticeCategories(updatedCategories)

    return {
      message: '카테고리 설정이 수정되었습니다.',
      categories: categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        channelId: category.channelId,
        roleId: category.roleId,
        roleName: category.roleName,
        isActive: category.isActive,
      })),
    }
  }

  async replaceNoticeConfig(guildId: string, body: SaveNoticeConfigBody) {
    const noticeSite = await noticeConfigRepository.findByGuildId(guildId)

    if (!noticeSite) {
      throw new AppError(404, 'Notice config not found')
    }

    const oldRoleIds = noticeSite.categories.flatMap((category) => (category.roleId ? [category.roleId] : []))
    const { categories, createdRoleIds } = await this.prepareCategoriesWithRoles(guildId, body.categories)
    assertActiveCategoriesHaveRoles(categories)

    try {
      await noticeConfigRepository.replaceNoticeConfig({
        guildId,
        site: body.site,
        categories,
      })
    } catch (error) {
      await Promise.allSettled(createdRoleIds.map((roleId) => discordService.deleteRole(guildId, roleId)))

      throw error
    }

    this.cleanupRoles(guildId, oldRoleIds)

    return {
      message: '공지 사이트 설정이 교체되었습니다.',
    }
  }

  async deleteNoticeConfig(guildId: string) {
    const noticeSite = await noticeConfigRepository.findByGuildId(guildId)

    if (!noticeSite) {
      throw new AppError(404, 'Notice config not found')
    }

    const roleIds = noticeSite.categories.flatMap((category) => (category.roleId ? [category.roleId] : []))

    await Promise.all(roleIds.map((roleId) => discordService.deleteRole(guildId, roleId)))

    await noticeConfigRepository.deleteByGuildId(guildId)

    return {
      message: 'IRIS 설정이 삭제되었습니다. 필요한 경우 Discord 서버에서 Bot을 제거할 수 있습니다.',
    }
  }

  async cleanupGuildNoticeConfig(guildId: string) {
    const noticeSite = await noticeConfigRepository.findByGuildId(guildId)

    if (!noticeSite) {
      return
    }

    await noticeConfigRepository.deleteByGuildId(guildId)
  }
}

export const noticeConfigService = new NoticeConfigService()
