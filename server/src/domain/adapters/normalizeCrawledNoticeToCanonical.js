import { z } from 'zod'
import {
  CAMPUS_IDS,
  CampusIdSchema,
  NoticeTypeSchema,
  createUniquePrimitiveArraySchema,
  hasExactlyAllCampusIds,
} from '../schemas/commonSchemas.js'
import {
  CanonicalNoticeSchema,
  parseCanonicalNotice,
} from '../schemas/canonicalNoticeSchema.js'
import { CrawledNoticeSchema } from '../schemas/crawledNoticeSchema.js'
import {
  AdapterContextSchema,
  hashAdapterText,
} from './adapterContext.js'
import { resolveCanonicalNoticeRevision } from './canonicalNoticeRevision.js'

export const CrawlerCampusResolutionSchema = z
  .object({
    targetScope: z.enum(['all', 'specific']),
    targetCampuses: createUniquePrimitiveArraySchema(CampusIdSchema, {
      min: 1,
      message: 'Expected unique target campus IDs.',
    }),
    excludedCampuses: createUniquePrimitiveArraySchema(CampusIdSchema, {
      message: 'Expected unique excluded campus IDs.',
    }),
  })
  .strict()
  .superRefine((resolution, context) => {
    const excludedCampusSet = new Set(resolution.excludedCampuses)

    if (
      resolution.targetCampuses.some((campus) =>
        excludedCampusSet.has(campus),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Target and excluded campuses must not overlap.',
        path: ['excludedCampuses'],
      })
    }

    if (
      resolution.targetScope === 'all' &&
      !hasExactlyAllCampusIds(resolution.targetCampuses)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The all scope requires all four physical campuses.',
        path: ['targetCampuses'],
      })
    }

    if (
      resolution.targetScope === 'specific' &&
      resolution.targetCampuses.length >= CAMPUS_IDS.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The specific scope requires one to three physical campuses.',
        path: ['targetCampuses'],
      })
    }
  })

export const CrawlerNoticeTypeResolutionSchema = z
  .object({
    noticeType: NoticeTypeSchema,
    noticeTypeBasis: z.enum(['rule', 'ai']),
  })
  .strict()

const CrawledNoticeCanonicalAdapterArgumentsSchema = z
  .object({
    crawledNotice: CrawledNoticeSchema,
    previousCanonicalNotice: CanonicalNoticeSchema.nullable(),
    campusResolution: CrawlerCampusResolutionSchema.nullable(),
    noticeTypeResolution: CrawlerNoticeTypeResolutionSchema.nullable(),
    context: AdapterContextSchema,
  })
  .strict()

function setsEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value) => right.includes(value))
  )
}

function createSourceIdentity({ institutionId, sourceBoard, sourcePostId }) {
  return `${institutionId}:${sourceBoard.category}:${sourcePostId}`
}

function assertCanonicalizableCrawledNotice(crawledNotice) {
  if (crawledNotice.crawlStatus !== 'active') {
    throw new TypeError('Only an active crawled notice can be canonicalized.')
  }

  if (crawledNotice.contentExtractionStatus === 'failed') {
    throw new TypeError('A failed content extraction cannot be canonicalized.')
  }

  const derivedSourceIdentity = createSourceIdentity(crawledNotice)

  if (derivedSourceIdentity !== crawledNotice.sourceIdentityKey) {
    throw new TypeError(
      'Crawled notice sourceIdentityKey must match its source identity fields.',
    )
  }
}

function assertUpdatablePreviousNotice(
  previousCanonicalNotice,
  sourceIdentityKey,
) {
  if (previousCanonicalNotice === null) {
    return
  }

  if (previousCanonicalNotice.sourceKind !== 'crawler') {
    throw new TypeError(
      'A crawler canonical adapter requires previous sourceKind=crawler.',
    )
  }

  if (previousCanonicalNotice.status !== 'active') {
    throw new TypeError(
      'A crawler canonical adapter can update only an active notice.',
    )
  }

  const previousSourceIdentity = createSourceIdentity(previousCanonicalNotice)

  if (previousSourceIdentity !== sourceIdentityKey) {
    throw new TypeError(
      'Previous canonical notice must have the same source identity.',
    )
  }
}

function createFallbackCampusMetadata(listedCampusClassification) {
  if (listedCampusClassification.scope === 'all') {
    return {
      listedCampusClassification,
      targetScope: 'all',
      targetCampuses: [...listedCampusClassification.campuses],
      excludedCampuses: [],
      targetCampusBasis: 'listed_campus_default',
      campusReviewRequired: false,
      campusReviewReasons: [],
    }
  }

  if (listedCampusClassification.scope === 'specific') {
    return {
      listedCampusClassification,
      targetScope: 'source_default',
      targetCampuses: [...listedCampusClassification.campuses],
      excludedCampuses: [],
      targetCampusBasis: 'listed_campus_default',
      campusReviewRequired: false,
      campusReviewReasons: [],
    }
  }

  return {
    listedCampusClassification,
    targetScope: 'unknown',
    targetCampuses: [],
    excludedCampuses: [],
    targetCampusBasis: 'unknown',
    campusReviewRequired: true,
    campusReviewReasons: ['target_campus_unresolved'],
  }
}

function createResolvedCampusMetadata(
  listedCampusClassification,
  campusResolution,
) {
  if (campusResolution === null) {
    return createFallbackCampusMetadata(listedCampusClassification)
  }

  const sourceConflict =
    listedCampusClassification.scope !== 'unknown' &&
    !setsEqual(
      listedCampusClassification.campuses,
      campusResolution.targetCampuses,
    )
  const campusReviewReasons = sourceConflict
    ? ['source_target_campus_conflict']
    : []

  return {
    listedCampusClassification,
    targetScope: campusResolution.targetScope,
    targetCampuses: campusResolution.targetCampuses,
    excludedCampuses: campusResolution.excludedCampuses,
    targetCampusBasis: 'explicit_text',
    campusReviewRequired: campusReviewReasons.length > 0,
    campusReviewReasons,
  }
}

function createNoticeTypeMetadata(sourceBoard, noticeTypeResolution) {
  const boardHint = sourceBoard.noticeTypeHint ?? null

  if (noticeTypeResolution !== null) {
    return {
      noticeType: noticeTypeResolution.noticeType,
      noticeTypeBasis: noticeTypeResolution.noticeTypeBasis,
      noticeTypeConflict:
        boardHint !== null && boardHint !== noticeTypeResolution.noticeType,
    }
  }

  if (boardHint !== null) {
    return {
      noticeType: boardHint,
      noticeTypeBasis: 'board_hint',
      noticeTypeConflict: false,
    }
  }

  return {
    noticeType: 'unknown',
    noticeTypeBasis: 'unknown',
    noticeTypeConflict: false,
  }
}

export function normalizeCrawledNoticeToCanonical(input) {
  const {
    crawledNotice,
    previousCanonicalNotice,
    campusResolution,
    noticeTypeResolution,
    context,
  } = CrawledNoticeCanonicalAdapterArgumentsSchema.parse(input)

  assertCanonicalizableCrawledNotice(crawledNotice)
  assertUpdatablePreviousNotice(
    previousCanonicalNotice,
    crawledNotice.sourceIdentityKey,
  )

  const semanticHashInput =
    crawledNotice.contentText === ''
      ? crawledNotice.title
      : crawledNotice.contentText
  const semanticContentHash = hashAdapterText(context, semanticHashInput)
  const revision = resolveCanonicalNoticeRevision({
    previousCanonicalNotice,
    contentHash: crawledNotice.contentHash,
    context,
  })
  const campus = createResolvedCampusMetadata(
    crawledNotice.listedCampusClassification,
    campusResolution,
  )
  const noticeType = createNoticeTypeMetadata(
    crawledNotice.sourceBoard,
    noticeTypeResolution,
  )

  return parseCanonicalNotice({
    schemaVersion: 1,
    noticeId: revision.noticeId,
    sourceKind: 'crawler',
    institutionId: crawledNotice.institutionId,
    sourceBoard: crawledNotice.sourceBoard,
    sourcePostId: crawledNotice.sourcePostId,
    sourceUrl: crawledNotice.sourceUrl,
    canonicalSourceUrl: crawledNotice.canonicalSourceUrl,
    title: crawledNotice.title,
    publishedAt: crawledNotice.publishedAt,
    normalizedText: crawledNotice.contentText,
    attachments: crawledNotice.attachments,
    boardCategory: crawledNotice.sourceBoard.category,
    noticeType: noticeType.noticeType,
    noticeTypeBasis: noticeType.noticeTypeBasis,
    noticeTypeConflict: noticeType.noticeTypeConflict,
    campus,
    contentHash: crawledNotice.contentHash,
    semanticContentHash,
    revision: revision.revision,
    status: 'active',
    supersededByNoticeId: null,
    createdAt: revision.createdAt,
    updatedAt: revision.updatedAt,
  })
}
