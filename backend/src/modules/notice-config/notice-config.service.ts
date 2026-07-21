import { AppError } from '../../shared/errors/app-error.js'
import { crawlNotices } from '../crawling/index.js'
import { noticeConfigRepository } from './notice-config.repository.js'
import type { SaveNoticeConfigBody, TestCrawlBody } from './notice-config.schemas.js'

export class NoticeConfigService {
  async testCrawlNoticeConfig(_guildId: string, body: TestCrawlBody) {
    return crawlNotices(body)
  }

  async saveNoticeConfig(guildId: string, body: SaveNoticeConfigBody) {
    const existingNoticeSite = await noticeConfigRepository.findByGuildId(guildId)

    if (existingNoticeSite) {
      throw new AppError(409, 'Notice config already exists')
    }

    await noticeConfigRepository.createNoticeConfig({
      guildId,
      site: body.site,
      categories: body.categories.map((category) => ({
        name: category.name,
        channelId: category.channelId,
        roleName: category.roleName || category.name,
        isActive: category.isActive,
        roleId: null,
      })),
    })

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

  async deleteNoticeConfig(guildId: string) {
    const noticeSite = await noticeConfigRepository.findByGuildId(guildId)

    if (!noticeSite) {
      throw new AppError(404, 'Notice config not found')
    }

    await noticeConfigRepository.deleteByGuildId(guildId)

    return {
      message: 'IRIS 설정이 삭제되었습니다. 필요한 경우 Discord 서버에서 Bot을 제거할 수 있습니다.',
    }
  }
}

export const noticeConfigService = new NoticeConfigService()
