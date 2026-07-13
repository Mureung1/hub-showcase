import { z } from 'zod'
import {
  CAMPUS_IDS,
  ConfidenceSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  createUniquePrimitiveArraySchema,
  isValidIsoDate,
} from '../schemas/commonSchemas.js'
import { CanonicalNoticeSchema } from '../schemas/canonicalNoticeSchema.js'
import { parseExtractionResult } from '../schemas/extractionSchema.js'
import {
  AdapterContextSchema,
  createAdapterId,
} from './adapterContext.js'

const KNU_INSTITUTION_ID = 'kangwon'
const KNU_TIMEZONE = 'Asia/Seoul'
const KNU_EXTRACTOR_VERSION = '0.4.4'
const TIMED_START_PATTERN =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\+09:00$/
const REVIEW_REASON_PRIORITY = [
  'ambiguous_date',
  'missing_evidence',
  'evidence_not_exact',
  'low_confidence',
  'unknown_actor',
  'other',
]

const EVENT_TYPE_MAPPING = {
  application_deadline: 'application_deadline',
  submission_deadline: 'submission_deadline',
  payment_deadline: 'payment_deadline',
  deadline: 'general_deadline',
}

const WARNING_UNCERTAINTY_REASONS = new Set([
  'weak_action_type',
  'uncertain_keyword:추후',
  'uncertain_keyword:예정',
  'uncertain_keyword:선착순',
  'uncertain_keyword:별도 공지',
  'uncertain_keyword:변동 가능',
])

const SourceNonEmptyStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0, 'Expected a non-empty string.')
const SourceCampusIdSchema = z.enum([
  ...CAMPUS_IDS,
  'all',
  'unknown',
])
const SourceUncertaintyReasonSchema = z.enum([
  'missing_evidence',
  'missing_normalized_date',
  'unknown_actor',
  'internal_actor',
  'weak_action_type',
  'uncertain_keyword:추후',
  'uncertain_keyword:예정',
  'uncertain_keyword:선착순',
  'uncertain_keyword:별도 공지',
  'uncertain_keyword:변동 가능',
])
const TimedStartSchema = z
  .string()
  .regex(TIMED_START_PATTERN)
  .refine(
    (value) =>
      isValidIsoDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value)),
    'Expected a valid +09:00 datetime.',
  )
const SourceNormalizedStartSchema = z.union([
  IsoDateSchema,
  TimedStartSchema,
  z.null(),
])

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function setsEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value) => right.includes(value))
  )
}

function recordsEqual(left, right) {
  const leftEntries = Object.entries(left)
  const rightKeys = Object.keys(right)

  return (
    leftEntries.length === rightKeys.length &&
    leftEntries.every(([key, value]) => right[key] === value)
  )
}

function campusScopesEqual(left, right) {
  return (
    left.sourceLabel === right.sourceLabel &&
    arraysEqual(left.campuses, right.campuses) &&
    left.scopeType === right.scopeType &&
    left.confidence === right.confidence &&
    left.source === right.source &&
    recordsEqual(left.labels, right.labels)
  )
}

function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, ' ')
}

const SourceCampusScopeSchema = z
  .object({
    sourceLabel: z.string().nullable(),
    campuses: createUniquePrimitiveArraySchema(SourceCampusIdSchema, { min: 1 }),
    scopeType: z.enum(['campus_specific', 'all_campuses', 'unknown']),
    confidence: ConfidenceSchema,
    source: z.enum([
      'listMetadata.campus',
      'title_or_body',
      'listMetadata.author',
      'listMetadata.campus_or_author',
      'none',
    ]),
    labels: z.record(z.string(), z.string()),
  })
  .strict()
  .superRefine((scope, context) => {
    if (
      scope.scopeType === 'all_campuses' &&
      !arraysEqual(scope.campuses, ['all'])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'all_campuses requires only the all sentinel.',
        path: ['campuses'],
      })
    }

    if (
      scope.scopeType === 'unknown' &&
      !arraysEqual(scope.campuses, ['unknown'])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'unknown requires only the unknown sentinel.',
        path: ['campuses'],
      })
    }

    if (
      scope.scopeType === 'campus_specific' &&
      scope.campuses.some((campus) => !CAMPUS_IDS.includes(campus))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'campus_specific requires physical campus IDs.',
        path: ['campuses'],
      })
    }

    if (scope.source === 'none' && scope.scopeType !== 'unknown') {
      context.addIssue({
        code: 'custom',
        message: 'A none campus source requires unknown scope.',
        path: ['scopeType'],
      })
    }
  })

const SourceCandidateSchema = z
  .object({
    id: SourceNonEmptyStringSchema,
    uidHint: SourceNonEmptyStringSchema,
    sourceNoticeId: SourceNonEmptyStringSchema,
    sourceTitle: SourceNonEmptyStringSchema,
    sourceUrl: z.string().url(),
    noticeType: SourceNonEmptyStringSchema,
    campusScope: SourceCampusScopeSchema,
    eventType: z.enum(Object.keys(EVENT_TYPE_MAPPING)),
    targetActor: z.enum(['student', 'department', 'unknown']),
    title: SourceNonEmptyStringSchema,
    dateText: z.string(),
    normalizedStart: SourceNormalizedStartSchema,
    normalizedEnd: z.null(),
    isAllDay: z.boolean().nullable(),
    evidence: z.string(),
    evidenceLineIndex: z.number().int().nonnegative().nullable(),
    confidence: ConfidenceSchema,
    uncertaintyReasons: createUniquePrimitiveArraySchema(
      SourceUncertaintyReasonSchema,
    ),
    status: z.enum(['auto_confirmed', 'needs_review']),
    includeInCalendarFeed: z.boolean(),
    createdBy: z.literal('rule'),
    reviewedByUser: z.boolean(),
  })
  .strict()
  .superRefine((candidate, context) => {
    const expectedUidHint = candidate.id.startsWith('cand-')
      ? `noticepilot-${candidate.id.slice(5)}@noticepilot.local`
      : null

    if (expectedUidHint === null || candidate.uidHint !== expectedUidHint) {
      context.addIssue({
        code: 'custom',
        message: 'uidHint must be derived from the source candidate ID.',
        path: ['uidHint'],
      })
    }

    const hasInternalActorReason =
      candidate.uncertaintyReasons.includes('internal_actor')

    if (hasInternalActorReason !== (candidate.targetActor === 'department')) {
      context.addIssue({
        code: 'custom',
        message: 'internal_actor must match targetActor=department.',
        path: ['uncertaintyReasons'],
      })
    }

    if (candidate.normalizedStart === null && candidate.isAllDay !== null) {
      context.addIssue({
        code: 'custom',
        message: 'A null normalizedStart requires isAllDay=null.',
        path: ['isAllDay'],
      })
    }

    if (
      candidate.normalizedStart !== null &&
      candidate.normalizedStart.length === 10 &&
      candidate.isAllDay !== true
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A date-only normalizedStart requires isAllDay=true.',
        path: ['isAllDay'],
      })
    }

    if (
      candidate.normalizedStart !== null &&
      candidate.normalizedStart.length > 10 &&
      candidate.isAllDay !== false
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A timed normalizedStart requires isAllDay=false.',
        path: ['isAllDay'],
      })
    }
  })

const SourceSummarySchema = z
  .object({
    candidateCount: z.number().int().nonnegative(),
    autoConfirmedCount: z.number().int().nonnegative(),
    needsReviewCount: z.number().int().nonnegative(),
    calendarFeedIncludedCount: z.number().int().nonnegative(),
  })
  .strict()

const KnuRuleCandidatePayloadSchema = z
  .object({
    schemaVersion: z.literal('noticepilot.calendarCandidates.v0.4'),
    sourceNoticeId: SourceNonEmptyStringSchema,
    sourceContentHash: SourceNonEmptyStringSchema,
    sourceTitle: SourceNonEmptyStringSchema,
    sourceUrl: z.string().url(),
    timezone: z.literal(KNU_TIMEZONE),
    sourceCampusScope: SourceCampusScopeSchema,
    extractor: z
      .object({
        version: z.literal(KNU_EXTRACTOR_VERSION),
        createdAt: IsoDateTimeSchema,
        mode: z.literal('rule_based_v1'),
      })
      .strict(),
    candidates: z.array(SourceCandidateSchema),
    summary: SourceSummarySchema,
  })
  .strict()
  .superRefine((payload, context) => {
    const candidateIds = payload.candidates.map((candidate) => candidate.id)

    if (new Set(candidateIds).size !== candidateIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Expected unique source candidate IDs.',
        path: ['candidates'],
      })
    }

    payload.candidates.forEach((candidate, index) => {
      const duplicateFields = [
        ['sourceNoticeId', payload.sourceNoticeId],
        ['sourceTitle', payload.sourceTitle],
        ['sourceUrl', payload.sourceUrl],
      ]

      duplicateFields.forEach(([field, expectedValue]) => {
        if (candidate[field] !== expectedValue) {
          context.addIssue({
            code: 'custom',
            message: `${field} must match the payload-level value.`,
            path: ['candidates', index, field],
          })
        }
      })

      if (!campusScopesEqual(candidate.campusScope, payload.sourceCampusScope)) {
        context.addIssue({
          code: 'custom',
          message: 'Candidate campusScope must match sourceCampusScope.',
          path: ['candidates', index, 'campusScope'],
        })
      }
    })

    const actualSummary = {
      candidateCount: payload.candidates.length,
      autoConfirmedCount: payload.candidates.filter(
        (candidate) => candidate.status === 'auto_confirmed',
      ).length,
      needsReviewCount: payload.candidates.filter(
        (candidate) => candidate.status === 'needs_review',
      ).length,
      calendarFeedIncludedCount: payload.candidates.filter(
        (candidate) => candidate.includeInCalendarFeed,
      ).length,
    }

    Object.entries(actualSummary).forEach(([field, value]) => {
      if (payload.summary[field] !== value) {
        context.addIssue({
          code: 'custom',
          message: `${field} must match the candidate array.`,
          path: ['summary', field],
        })
      }
    })
  })

const KnuRuleCandidateAdapterArgumentsSchema = z
  .object({
    candidatePayload: KnuRuleCandidatePayloadSchema,
    canonicalNotice: CanonicalNoticeSchema,
    context: AdapterContextSchema,
  })
  .strict()

function sourceCampusToListedClassification(sourceCampusScope) {
  const rawLabel =
    collapseWhitespace(sourceCampusScope.sourceLabel ?? '') || null

  if (sourceCampusScope.scopeType === 'all_campuses') {
    return { rawLabel, campuses: [...CAMPUS_IDS], scope: 'all' }
  }

  if (sourceCampusScope.scopeType === 'unknown') {
    return { rawLabel, campuses: [], scope: 'unknown' }
  }

  return {
    rawLabel,
    campuses: sourceCampusScope.campuses,
    scope: 'specific',
  }
}

function assertCanonicalNoticeBoundary(canonicalNotice) {
  if (
    canonicalNotice.sourceKind !== 'crawler' ||
    canonicalNotice.institutionId !== KNU_INSTITUTION_ID ||
    canonicalNotice.status !== 'active' ||
    canonicalNotice.sourceBoard === null ||
    canonicalNotice.sourcePostId === null ||
    canonicalNotice.sourceUrl === null ||
    canonicalNotice.boardCategory === null ||
    canonicalNotice.sourceBoard.boardKey !==
      `knu-bbs-${canonicalNotice.sourceBoard.boardId}`
  ) {
    throw new TypeError('Expected an active KNU crawler canonical notice.')
  }
}

function assertPayloadMatchesCanonicalNotice(payload, canonicalNotice) {
  const expectedSourceNoticeId =
    `knu-${canonicalNotice.sourceBoard.boardId}-${canonicalNotice.sourcePostId}`

  if (payload.sourceNoticeId !== expectedSourceNoticeId) {
    throw new TypeError('Source notice ID must match the canonical KNU source.')
  }

  if (payload.sourceContentHash !== canonicalNotice.contentHash) {
    throw new TypeError('Source content hash must match canonical contentHash.')
  }

  if (
    payload.sourceTitle !== canonicalNotice.title ||
    payload.sourceUrl !== canonicalNotice.sourceUrl
  ) {
    throw new TypeError('Source title and URL must match the canonical notice.')
  }

  if (
    payload.candidates.some(
      (candidate) => candidate.noticeType !== canonicalNotice.boardCategory,
    )
  ) {
    throw new TypeError('Candidate noticeType must match canonical boardCategory.')
  }

  const sourceListed = sourceCampusToListedClassification(
    payload.sourceCampusScope,
  )
  const canonicalListed = canonicalNotice.campus.listedCampusClassification

  if (
    sourceListed.rawLabel !== canonicalListed.rawLabel ||
    sourceListed.scope !== canonicalListed.scope ||
    !setsEqual(sourceListed.campuses, canonicalListed.campuses)
  ) {
    throw new TypeError(
      'Source campus scope must match canonical listed-campus classification.',
    )
  }
}

function normalizeTemporalFields(candidate) {
  if (candidate.normalizedStart === null) {
    return {
      normalizedDate: null,
      normalizedTime: null,
      timezone: null,
      isAllDay: null,
      timeExpression: '',
    }
  }

  if (candidate.normalizedStart.length === 10) {
    return {
      normalizedDate: candidate.normalizedStart,
      normalizedTime: null,
      timezone: null,
      isAllDay: true,
      timeExpression: '',
    }
  }

  return {
    normalizedDate: candidate.normalizedStart.slice(0, 10),
    normalizedTime: candidate.normalizedStart.slice(11, 16),
    timezone: KNU_TIMEZONE,
    isAllDay: false,
    timeExpression: candidate.dateText,
  }
}

function createEvidence(candidate, canonicalText, context) {
  if (candidate.evidence === '') {
    return { evidence: [], missing: true, exactMatch: false }
  }

  const startOffset = canonicalText.indexOf(candidate.evidence)
  const exactMatch = startOffset >= 0

  return {
    evidence: [
      {
        evidenceId: createAdapterId(context, 'evidence'),
        exactText: candidate.evidence,
        sourcePart: 'body',
        attachmentId: null,
        exactMatch,
        startOffset: exactMatch ? startOffset : null,
        endOffset: exactMatch ? startOffset + candidate.evidence.length : null,
        sourceLineIndex: candidate.evidenceLineIndex,
      },
    ],
    missing: false,
    exactMatch,
  }
}

function createReview(candidate, temporal, evidenceConversion) {
  const reasons = new Set()
  const warningReasons = []

  candidate.uncertaintyReasons.forEach((reason) => {
    if (reason === 'missing_evidence') reasons.add('missing_evidence')
    if (reason === 'missing_normalized_date') reasons.add('ambiguous_date')
    if (reason === 'unknown_actor') reasons.add('unknown_actor')

    if (WARNING_UNCERTAINTY_REASONS.has(reason)) {
      reasons.add('other')
      warningReasons.push(reason)
    }
  })

  if (temporal.normalizedDate === null) reasons.add('ambiguous_date')

  if (evidenceConversion.missing) {
    reasons.add('missing_evidence')
  } else if (!evidenceConversion.exactMatch) {
    reasons.add('evidence_not_exact')
  }

  if (candidate.confidence === 'low') reasons.add('low_confidence')
  if (candidate.targetActor === 'unknown') reasons.add('unknown_actor')

  const reviewReasons = REVIEW_REASON_PRIORITY.filter((reason) =>
    reasons.has(reason),
  )

  return {
    reviewRequired: reviewReasons.length > 0,
    reviewReasons,
    warningReasons,
  }
}

export function normalizeKnuRuleCandidatesToExtractionResult(input) {
  const { candidatePayload, canonicalNotice, context } =
    KnuRuleCandidateAdapterArgumentsSchema.parse(input)

  assertCanonicalNoticeBoundary(canonicalNotice)
  assertPayloadMatchesCanonicalNotice(candidatePayload, canonicalNotice)

  const extractionId = createAdapterId(context, 'extraction')
  const warnings = []
  const calendarEventCandidates = candidatePayload.candidates.map(
    (sourceCandidate) => {
      const candidateId = createAdapterId(context, 'calendar_event_candidate')
      const temporal = normalizeTemporalFields(sourceCandidate)
      const evidenceConversion = createEvidence(
        sourceCandidate,
        canonicalNotice.normalizedText,
        context,
      )
      const review = createReview(
        sourceCandidate,
        temporal,
        evidenceConversion,
      )

      review.warningReasons.forEach((reason) => {
        warnings.push({
          type: 'knu_rule_uncertainty',
          message: reason,
          itemId: null,
          candidateId,
        })
      })

      return {
        schemaVersion: 1,
        candidateId,
        extractionId,
        sourceNoticeId: canonicalNotice.noticeId,
        relatedItemId: null,
        sourceCandidateKey: sourceCandidate.id,
        title: sourceCandidate.title,
        description: '',
        eventType: 'deadline',
        eventSubtype: EVENT_TYPE_MAPPING[sourceCandidate.eventType],
        targetActor: sourceCandidate.targetActor,
        dateExpression: sourceCandidate.dateText,
        normalizedDate: temporal.normalizedDate,
        timeExpression: temporal.timeExpression,
        normalizedTime: temporal.normalizedTime,
        timezone: temporal.timezone,
        isAllDay: temporal.isAllDay,
        evidence: evidenceConversion.evidence,
        confidence: sourceCandidate.confidence,
        reviewRequired: review.reviewRequired,
        reviewReasons: review.reviewReasons,
        candidateStatus: 'pending',
        suppressionReason: null,
        createdAt: candidatePayload.extractor.createdAt,
        updatedAt: candidatePayload.extractor.createdAt,
      }
    },
  )

  return parseExtractionResult({
    schemaVersion: 1,
    extractionId,
    sourceNoticeId: canonicalNotice.noticeId,
    extractionMethod: 'rule',
    sourceContentHash: canonicalNotice.contentHash,
    provider: null,
    model: null,
    promptVersion: null,
    extractorVersion: candidatePayload.extractor.version,
    schemaContractVersion: 'noticepilot.domain.v1',
    summary: '',
    inferredTitle: null,
    detectedNoticeType: canonicalNotice.noticeType,
    detectedLanguage: 'unknown',
    items: [],
    calendarEventCandidates,
    warnings,
    status: 'completed',
    createdAt: candidatePayload.extractor.createdAt,
  })
}
