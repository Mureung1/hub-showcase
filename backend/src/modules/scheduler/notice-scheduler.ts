import cron from 'node-cron'
import { crawlNotices } from '../crawling/index.js'
import { createNoticeHashKey, normalizeNoticeLink } from '../notice/notice-identity.js'
import { noticeService } from '../notice/notice.service.js'
import { noticeConfigRepository } from '../notice-config/notice-config.repository.js'
import { discordService } from '../discord/discord.service.js'
import { keywordService } from '../keyword/keyword.service.js'
import { logger } from '../../shared/logger/logger.js'

const noticeSchedulerExpression = '*/30 * * * *'

type NotificationCategory = {
  id: number
  name: string
  channelId: string
  roleId: string
}

let isStarted = false
let isRunning = false

function isAllCategoryName(categoryName: string) {
  return categoryName.trim().toLowerCase() === '전체'
}

export function startNoticeScheduler() {
  if (isStarted) {
    return
  }

  cron.schedule(noticeSchedulerExpression, () => {
    void runNoticeSchedulerOnce()
  })

  isStarted = true

  logger.info('Notice scheduler started', {
    cron: noticeSchedulerExpression,
  })
}

export async function runNoticeSchedulerOnce() {
  if (isRunning) {
    logger.warn('Notice scheduler skipped because previous job is still running')
    return
  }

  isRunning = true

  try {
    logger.info('Notice scheduler job started')
    const noticeSites = await noticeConfigRepository.findAllNoticeSites()

    logger.info('Notice scheduler loaded notice sites', {
      count: noticeSites.length,
    })

    for (const noticeSite of noticeSites) {
      try {
        const activeCategories = noticeSite.categories.filter((category) => category.isActive)
        const activeCategoryByName = new Map(activeCategories.map((category) => [category.name, category]))
        const allCategory = activeCategories.find((category) => isAllCategoryName(category.name))

        logger.info('Notice scheduler queued notice site', {
          guildId: noticeSite.guildId,
          noticeSiteId: noticeSite.id,
          siteName: noticeSite.name,
          activeCategoryCount: activeCategories.length,
        })

        const crawlResult = await crawlNotices({
          name: noticeSite.name,
          url: noticeSite.url,
          listSelector: noticeSite.listSelector,
          titleSelector: noticeSite.titleSelector,
          linkSelector: noticeSite.linkSelector,
          dateSelector: noticeSite.dateSelector,
          categorySelector: noticeSite.categorySelector,
          categoryListSelector: noticeSite.categoryListSelector,
        })
        const existingNoticeCount = await noticeService.countNoticesByNoticeSiteId(noticeSite.id)
        const isInitialCollection = existingNoticeCount === 0
        const activeNotices = crawlResult.notices.flatMap((notice) => {
          const category = activeCategoryByName.get(notice.category)

          if (!category) {
            return []
          }

          const normalizedLink = normalizeNoticeLink(notice.link)

          return [{
            noticeSiteId: noticeSite.id,
            categoryId: category.id,
            hashKey: createNoticeHashKey(noticeSite.id, normalizedLink),
            title: notice.title,
            link: notice.link,
            date: new Date(notice.date),
            normalizedLink,
            firstSeenAt: new Date(),
          }]
        })
        const result = await noticeService.saveNewNotices(activeNotices)

        if (isInitialCollection) {
          logger.info('Notice scheduler skipped notifications for initial collection', {
            guildId: noticeSite.guildId,
            noticeSiteId: noticeSite.id,
            savedNoticeCount: result.savedCount,
          })
        } else {
          let sentKeywordDmCount = 0
          let sentNotificationCount = 0

          for (const notice of result.newNotices) {
            const category = activeCategories.find((activeCategory) => activeCategory.id === notice.categoryId)

            if (!category) {
              logger.warn('Notice scheduler skipped notification because category role is missing', {
                guildId: noticeSite.guildId,
                noticeSiteId: noticeSite.id,
                categoryId: notice.categoryId,
                hashKey: notice.hashKey,
              })
              continue
            }

            const notificationCategories: NotificationCategory[] = []

            for (const notificationCategory of [category, allCategory]) {
              if (!notificationCategory?.roleId) {
                continue
              }

              if (notificationCategories.some((categoryItem) => categoryItem.id === notificationCategory.id)) {
                continue
              }

              notificationCategories.push({
                id: notificationCategory.id,
                name: notificationCategory.name,
                channelId: notificationCategory.channelId,
                roleId: notificationCategory.roleId,
              })
            }

            const [notificationChannel] = notificationCategories

            if (!notificationChannel) {
              logger.warn('Notice scheduler skipped notification because notification role is missing', {
                guildId: noticeSite.guildId,
                noticeSiteId: noticeSite.id,
                categoryId: notice.categoryId,
                hashKey: notice.hashKey,
              })
            } else {
              await discordService.sendNoticeNotification({
                guildId: noticeSite.guildId,
                channelId: notificationChannel.channelId,
                roleIds: notificationCategories.map((notificationCategory) => notificationCategory.roleId),
                title: notice.title,
                link: notice.link,
                date: notice.date,
                categoryName: category.name,
              })
              sentNotificationCount += 1
            }

            const keywordMatches = await keywordService.findNoticeKeywordMatches(noticeSite.guildId, notice.title)

            for (const keywordMatch of keywordMatches) {
              await discordService.sendKeywordNoticeDm({
                userId: keywordMatch.userId,
                title: notice.title,
                link: notice.link,
                date: notice.date,
                siteName: noticeSite.name,
                categoryName: category.name,
                matchedKeywords: keywordMatch.matchedKeywords,
              }).then(() => {
                sentKeywordDmCount += 1
              }).catch((error: unknown) => {
                logger.warn('Notice scheduler failed to send keyword DM', {
                  guildId: noticeSite.guildId,
                  noticeSiteId: noticeSite.id,
                  userId: keywordMatch.userId,
                  hashKey: notice.hashKey,
                  error: error instanceof Error ? error.message : String(error),
                })
              })
            }
          }

          logger.info('Notice scheduler sent keyword DMs', {
            guildId: noticeSite.guildId,
            noticeSiteId: noticeSite.id,
            sentKeywordDmCount,
            sentNotificationCount,
          })
        }

        logger.info('Notice scheduler crawled notice site', {
          guildId: noticeSite.guildId,
          noticeSiteId: noticeSite.id,
          crawledNoticeCount: crawlResult.notices.length,
          activeNoticeCount: activeNotices.length,
          newNoticeCount: result.savedCount,
          isInitialCollection,
        })
      } catch (error) {
        logger.error('Notice scheduler failed to process notice site', {
          guildId: noticeSite.guildId,
          noticeSiteId: noticeSite.id,
          siteName: noticeSite.name,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    logger.info('Notice scheduler job completed')
  } catch (error) {
    logger.error('Notice scheduler job failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    isRunning = false
  }
}
