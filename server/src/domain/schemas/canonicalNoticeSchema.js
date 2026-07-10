import { z } from 'zod'
import {
  CampusIdSchema,
  HashSchema,
  IdSchema,
  InstitutionIdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  NoticeTypeSchema,
  ReviewReasonSchema,
  SchemaVersionSchema,
  UrlSchema,
  createUniquePrimitiveArraySchema,
  hasExactlyAllCampusIds,
  hasMatchingReviewState,
} from './commonSchemas.js'
import {
  AttachmentRefSchema,
  ListedCampusClassificationSchema,
} from './crawledNoticeSchema.js'
import { SourceBoardSchema } from './sourceBoardSchema.js'

export const TargetScopeSchema = z.enum([
  'all',
  'specific',
  'source_default',
  'unknown',
])

export const TargetCampusBasisSchema = z.enum([
  'explicit_text',
  'listed_campus_default',
  'common_board_default',
  'manual_review',
  'unknown',
])

export const CanonicalCampusMetadataSchema = z
  .object({
    listedCampusClassification: ListedCampusClassificationSchema,
    targetScope: TargetScopeSchema,
    targetCampuses: createUniquePrimitiveArraySchema(CampusIdSchema, {
      message: 'Expected unique target campus IDs.',
    }),
    excludedCampuses: createUniquePrimitiveArraySchema(CampusIdSchema, {
      message: 'Expected unique excluded campus IDs.',
    }),
    targetCampusBasis: TargetCampusBasisSchema,
    campusReviewRequired: z.boolean(),
    campusReviewReasons: createUniquePrimitiveArraySchema(ReviewReasonSchema, {
      message: 'Expected unique campus review reasons.',
    }),
  })
  .strict()
  .superRefine((campus, context) => {
    const excludedCampusSet = new Set(campus.excludedCampuses)

    if (campus.targetCampuses.some((campusId) => excludedCampusSet.has(campusId))) {
      context.addIssue({
        code: 'custom',
        message: 'Target and excluded campuses must not overlap.',
        path: ['excludedCampuses'],
      })
    }

    if (campus.targetScope === 'all' && !hasExactlyAllCampusIds(campus.targetCampuses)) {
      context.addIssue({
        code: 'custom',
        message: 'The all target scope must contain all four physical campuses.',
        path: ['targetCampuses'],
      })
    }

    if (
      (campus.targetScope === 'specific' ||
        campus.targetScope === 'source_default') &&
      campus.targetCampuses.length < 1
    ) {
      context.addIssue({
        code: 'custom',
        message: 'This target scope requires at least one target campus.',
        path: ['targetCampuses'],
      })
    }

    if (campus.targetScope === 'unknown' && campus.targetCampuses.length !== 0) {
      context.addIssue({
        code: 'custom',
        message: 'The unknown target scope must contain no target campuses.',
        path: ['targetCampuses'],
      })
    }

    if (
      !hasMatchingReviewState(
        campus.campusReviewRequired,
        campus.campusReviewReasons,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'campusReviewRequired must be true if and only if campusReviewReasons is non-empty.',
        path: ['campusReviewRequired'],
      })
    }
  })

export const CanonicalNoticeSourceKindSchema = z.enum(['crawler', 'manual'])

export const NoticeTypeBasisSchema = z.enum([
  'manual',
  'rule',
  'ai',
  'board_hint',
  'unknown',
])

export const CanonicalNoticeStatusSchema = z.enum([
  'active',
  'deleted',
  'superseded',
])

export const CanonicalNoticeSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    noticeId: IdSchema,
    sourceKind: CanonicalNoticeSourceKindSchema,
    institutionId: InstitutionIdSchema.nullable(),
    sourceBoard: SourceBoardSchema.nullable(),
    sourcePostId: NonEmptyStringSchema.nullable(),
    sourceUrl: UrlSchema.nullable(),
    canonicalSourceUrl: UrlSchema.nullable(),
    title: NonEmptyStringSchema,
    publishedAt: IsoDateSchema.nullable(),
    normalizedText: z.string(),
    attachments: z.array(AttachmentRefSchema),
    boardCategory: NonEmptyStringSchema.nullable(),
    noticeType: NoticeTypeSchema,
    noticeTypeBasis: NoticeTypeBasisSchema,
    noticeTypeConflict: z.boolean(),
    campus: CanonicalCampusMetadataSchema,
    contentHash: HashSchema,
    semanticContentHash: HashSchema,
    revision: z.number().int().min(1),
    status: CanonicalNoticeStatusSchema,
    supersededByNoticeId: IdSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((notice, context) => {
    if (notice.sourceKind === 'crawler') {
      const requiredCrawlerFields = [
        'institutionId',
        'sourceBoard',
        'sourcePostId',
        'sourceUrl',
        'canonicalSourceUrl',
      ]

      requiredCrawlerFields.forEach((fieldName) => {
        if (notice[fieldName] === null) {
          context.addIssue({
            code: 'custom',
            message: `A crawler notice requires ${fieldName}.`,
            path: [fieldName],
          })
        }
      })
    }

    if (notice.institutionId === null && notice.sourceBoard !== null) {
      context.addIssue({
        code: 'custom',
        message: 'sourceBoard must be null when institutionId is null.',
        path: ['sourceBoard'],
      })
    }

    if (
      notice.institutionId !== null &&
      notice.sourceBoard !== null &&
      notice.sourceBoard.institutionId !== notice.institutionId
    ) {
      context.addIssue({
        code: 'custom',
        message: 'sourceBoard institutionId must match the notice institutionId.',
        path: ['sourceBoard', 'institutionId'],
      })
    }

    if (notice.status === 'superseded' && notice.supersededByNoticeId === null) {
      context.addIssue({
        code: 'custom',
        message: 'A superseded notice requires supersededByNoticeId.',
        path: ['supersededByNoticeId'],
      })
    }

    if (notice.status !== 'superseded' && notice.supersededByNoticeId !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Only a superseded notice may include supersededByNoticeId.',
        path: ['supersededByNoticeId'],
      })
    }

    if (notice.supersededByNoticeId === notice.noticeId) {
      context.addIssue({
        code: 'custom',
        message: 'A notice cannot supersede itself.',
        path: ['supersededByNoticeId'],
      })
    }

    if (notice.noticeTypeBasis === 'unknown' && notice.noticeType !== 'unknown') {
      context.addIssue({
        code: 'custom',
        message: 'An unknown noticeTypeBasis requires noticeType=unknown.',
        path: ['noticeType'],
      })
    }
  })

export function parseCanonicalCampusMetadata(input) {
  return CanonicalCampusMetadataSchema.parse(input)
}

export function safeParseCanonicalCampusMetadata(input) {
  return CanonicalCampusMetadataSchema.safeParse(input)
}

export function parseCanonicalNotice(input) {
  return CanonicalNoticeSchema.parse(input)
}

export function safeParseCanonicalNotice(input) {
  return CanonicalNoticeSchema.safeParse(input)
}
