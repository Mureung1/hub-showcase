import { z } from 'zod'
import {
  IdSchema,
  IsoDateSchema,
  NonEmptyStringSchema,
  NoticeTypeSchema,
  UrlSchema,
} from './commonSchemas.js'
import { CanonicalCampusMetadataSchema } from './canonicalNoticeSchema.js'
import { AttachmentRefSchema } from './crawledNoticeSchema.js'

export const ManualNoticeInputSchema = z
  .object({
    title: NonEmptyStringSchema,
    normalizedText: z.string(),
    publishedAt: IsoDateSchema.nullable(),
    institutionId: IdSchema.nullable(),
    sourceUrl: UrlSchema.nullable(),
    canonicalSourceUrl: UrlSchema.nullable(),
    boardCategory: NonEmptyStringSchema.nullable(),
    noticeType: NoticeTypeSchema,
    campus: CanonicalCampusMetadataSchema.nullable(),
    attachments: z.array(AttachmentRefSchema),
  })
  .strict()

export function parseManualNoticeInput(input) {
  return ManualNoticeInputSchema.parse(input)
}

export function safeParseManualNoticeInput(input) {
  return ManualNoticeInputSchema.safeParse(input)
}
