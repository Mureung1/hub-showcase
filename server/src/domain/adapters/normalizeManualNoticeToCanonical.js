import { z } from 'zod'
import {
  CanonicalNoticeSchema,
  parseCanonicalNotice,
} from '../schemas/canonicalNoticeSchema.js'
import { ManualNoticeInputSchema } from '../schemas/manualNoticeInputSchema.js'
import {
  AdapterContextSchema,
  hashAdapterText,
} from './adapterContext.js'
import { resolveCanonicalNoticeRevision } from './canonicalNoticeRevision.js'

const ManualNoticeAdapterArgumentsSchema = z
  .object({
    manualNoticeInput: ManualNoticeInputSchema,
    previousCanonicalNotice: CanonicalNoticeSchema.nullable(),
    context: AdapterContextSchema,
  })
  .strict()

function createUnresolvedCampusMetadata() {
  return {
    listedCampusClassification: {
      rawLabel: null,
      campuses: [],
      scope: 'unknown',
    },
    targetScope: 'unknown',
    targetCampuses: [],
    excludedCampuses: [],
    targetCampusBasis: 'unknown',
    campusReviewRequired: true,
    campusReviewReasons: ['target_campus_unresolved'],
  }
}

function assertUpdatablePreviousNotice(previousCanonicalNotice) {
  if (previousCanonicalNotice === null) {
    return
  }

  if (previousCanonicalNotice.sourceKind !== 'manual') {
    throw new TypeError('A manual notice adapter requires previous sourceKind=manual.')
  }

  if (previousCanonicalNotice.status !== 'active') {
    throw new TypeError('A manual notice adapter can update only an active notice.')
  }
}

export function normalizeManualNoticeToCanonical(input) {
  const { manualNoticeInput, previousCanonicalNotice, context } =
    ManualNoticeAdapterArgumentsSchema.parse(input)

  assertUpdatablePreviousNotice(previousCanonicalNotice)

  const contentHash = hashAdapterText(context, manualNoticeInput.normalizedText)
  const revision = resolveCanonicalNoticeRevision({
    previousCanonicalNotice,
    contentHash,
    context,
  })

  return parseCanonicalNotice({
    schemaVersion: 1,
    noticeId: revision.noticeId,
    sourceKind: 'manual',
    institutionId: manualNoticeInput.institutionId,
    sourceBoard: null,
    sourcePostId: null,
    sourceUrl: manualNoticeInput.sourceUrl,
    canonicalSourceUrl: manualNoticeInput.canonicalSourceUrl,
    title: manualNoticeInput.title,
    publishedAt: manualNoticeInput.publishedAt,
    normalizedText: manualNoticeInput.normalizedText,
    attachments: manualNoticeInput.attachments,
    boardCategory: manualNoticeInput.boardCategory,
    noticeType: manualNoticeInput.noticeType,
    noticeTypeBasis:
      manualNoticeInput.noticeType === 'unknown' ? 'unknown' : 'manual',
    noticeTypeConflict: false,
    campus:
      manualNoticeInput.campus === null
        ? createUnresolvedCampusMetadata()
        : manualNoticeInput.campus,
    contentHash,
    semanticContentHash: contentHash,
    revision: revision.revision,
    status: 'active',
    supersededByNoticeId: null,
    createdAt: revision.createdAt,
    updatedAt: revision.updatedAt,
  })
}
