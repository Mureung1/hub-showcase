import { z } from 'zod'

export const guildParamsSchema = z.object({
  guildId: z.string().min(1),
})

export const testCrawlBodySchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  listSelector: z.string().min(1),
  titleSelector: z.string().min(1),
  linkSelector: z.string().min(1),
  dateSelector: z.string().min(1),
  categorySelector: z.string().min(1),
  categoryListSelector: z.string().min(1),
})

export type GuildParams = z.infer<typeof guildParamsSchema>
export type TestCrawlBody = z.infer<typeof testCrawlBodySchema>
