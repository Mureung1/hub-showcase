import { z } from 'zod'

export const guildParamsSchema = z.object({
  guildId: z.string().trim().min(1),
})

export const testCrawlBodySchema = z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().url(),
  listSelector: z.string().trim().min(1),
  titleSelector: z.string().trim().min(1),
  linkSelector: z.string().trim().min(1),
  dateSelector: z.string().trim().min(1),
  categorySelector: z.string().trim().min(1),
  categoryListSelector: z.string().trim().min(1),
})

export const saveNoticeConfigBodySchema = z.object({
  site: testCrawlBodySchema,
  categories: z.array(
    z.object({
      name: z.string().trim().min(1),
      channelId: z.string().trim().min(1),
      roleName: z.string().trim().optional(),
      isActive: z.boolean(),
    }),
  ).min(1),
})

export const updateNoticeCategoriesBodySchema = z.object({
  categories: z.array(
    z.object({
      categoryId: z.number().int().positive(),
      channelId: z.string().trim().min(1),
      roleName: z.string().trim().optional(),
      isActive: z.boolean(),
    }),
  ).min(1),
})

export type GuildParams = z.infer<typeof guildParamsSchema>
export type TestCrawlBody = z.infer<typeof testCrawlBodySchema>
export type SaveNoticeConfigBody = z.infer<typeof saveNoticeConfigBodySchema>
export type UpdateNoticeCategoriesBody = z.infer<typeof updateNoticeCategoriesBodySchema>
