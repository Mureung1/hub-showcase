import { z } from 'zod'
import {
  CampusIdSchema,
  HashSchema,
  IdSchema,
  InstitutionIdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  SchemaVersionSchema,
  UrlSchema,
  createUniquePrimitiveArraySchema,
  hasExactlyAllCampusIds,
} from './commonSchemas.js'
import { SourceBoardSchema } from './sourceBoardSchema.js'

export const ListedCampusScopeSchema = z.enum(['all', 'specific', 'unknown'])

export const ListedCampusClassificationSchema = z
  .object({
    rawLabel: z.string().nullable(),
    campuses: createUniquePrimitiveArraySchema(CampusIdSchema, {
      message: 'Expected unique listed campus IDs.',
    }),
    scope: ListedCampusScopeSchema,
  })
  .strict()
  .superRefine((classification, context) => {
    if (
      classification.scope === 'all' &&
      !hasExactlyAllCampusIds(classification.campuses)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The all scope must contain all four physical campuses.',
        path: ['campuses'],
      })
    }

    if (
      classification.scope === 'specific' &&
      (classification.campuses.length < 1 || classification.campuses.length > 3)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The specific scope must contain one to three campuses.',
        path: ['campuses'],
      })
    }

    if (
      classification.scope === 'unknown' &&
      classification.campuses.length !== 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The unknown scope must contain no campuses.',
        path: ['campuses'],
      })
    }
  })

export const AttachmentExtractionStatusSchema = z.enum([
  'not_requested',
  'pending',
  'downloaded',
  'extracted',
  'failed',
  'unsupported',
])

export const AttachmentRefSchema = z
  .object({
    attachmentId: IdSchema,
    fileName: NonEmptyStringSchema,
    sourceUrl: UrlSchema,
    serverName: z.string().nullable(),
    sourcePath: z.string().nullable(),
    mediaType: z.string().nullable(),
    fileExtension: z.string().nullable(),
    fetchedAt: IsoDateTimeSchema.nullable(),
    sizeBytes: z.number().int().nonnegative().nullable(),
    contentHash: HashSchema.nullable(),
    extractionStatus: AttachmentExtractionStatusSchema,
    normalizedText: z.string().nullable(),
    errorCode: NonEmptyStringSchema.nullable(),
  })
  .strict()
  .superRefine((attachment, context) => {
    if (
      attachment.extractionStatus === 'extracted' &&
      attachment.normalizedText === null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'An extracted attachment requires normalizedText.',
        path: ['normalizedText'],
      })
    }

    if (attachment.extractionStatus === 'failed' && attachment.errorCode === null) {
      context.addIssue({
        code: 'custom',
        message: 'A failed attachment requires errorCode.',
        path: ['errorCode'],
      })
    }

    if (attachment.extractionStatus !== 'failed' && attachment.errorCode !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Only a failed attachment may include errorCode.',
        path: ['errorCode'],
      })
    }
  })

export const ContentExtractionStatusSchema = z.enum([
  'extracted',
  'empty',
  'failed',
])

export const CrawlStatusSchema = z.enum([
  'active',
  'missing',
  'deleted',
  'fetch_failed',
])

export const CrawledNoticeSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    crawledNoticeId: IdSchema,
    institutionId: InstitutionIdSchema,
    sourceInstitutionKey: NonEmptyStringSchema,
    sourceBoard: SourceBoardSchema,
    sourcePostId: NonEmptyStringSchema,
    sourceUrl: UrlSchema,
    canonicalSourceUrl: UrlSchema,
    title: NonEmptyStringSchema,
    publishedAt: IsoDateSchema.nullable(),
    fetchedAt: IsoDateTimeSchema,
    contentText: z.string(),
    contentExtractionStatus: ContentExtractionStatusSchema,
    listedCampusClassification: ListedCampusClassificationSchema,
    attachments: z.array(AttachmentRefSchema),
    rawSourceHash: HashSchema.nullable(),
    contentHash: HashSchema,
    sourceIdentityKey: NonEmptyStringSchema,
    crawlStatus: CrawlStatusSchema,
  })
  .strict()
  .superRefine((notice, context) => {
    const attachmentIds = notice.attachments.map(
      (attachment) => attachment.attachmentId,
    )

    if (new Set(attachmentIds).size !== attachmentIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Expected unique attachment IDs.',
        path: ['attachments'],
      })
    }

    if (
      notice.contentExtractionStatus === 'extracted' &&
      notice.contentText.trim().length === 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Extracted contentText must not be empty.',
        path: ['contentText'],
      })
    }

    if (
      notice.contentExtractionStatus === 'empty' &&
      notice.contentText !== ''
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Empty extraction status requires contentText to be empty.',
        path: ['contentText'],
      })
    }
  })

export function parseListedCampusClassification(input) {
  return ListedCampusClassificationSchema.parse(input)
}

export function safeParseListedCampusClassification(input) {
  return ListedCampusClassificationSchema.safeParse(input)
}

export function parseAttachmentRef(input) {
  return AttachmentRefSchema.parse(input)
}

export function safeParseAttachmentRef(input) {
  return AttachmentRefSchema.safeParse(input)
}

export function parseCrawledNotice(input) {
  return CrawledNoticeSchema.parse(input)
}

export function safeParseCrawledNotice(input) {
  return CrawledNoticeSchema.safeParse(input)
}
