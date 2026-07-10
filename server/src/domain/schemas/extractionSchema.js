import { z } from 'zod'
import {
  ConfidenceSchema,
  EventTypeSchema,
  HashSchema,
  IdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  IsoTimeSchema,
  NonEmptyStringSchema,
  NoticeTypeSchema,
  ReviewReasonSchema,
  SchemaVersionSchema,
  TargetActorSchema,
  TimezoneSchema,
  createUniquePrimitiveArraySchema,
  hasMatchingReviewState,
} from './commonSchemas.js'

function addReviewStateIssue(value, context) {
  if (!hasMatchingReviewState(value.reviewRequired, value.reviewReasons)) {
    context.addIssue({
      code: 'custom',
      message:
        'reviewRequired must be true if and only if reviewReasons is non-empty.',
      path: ['reviewRequired'],
    })
  }
}

export const EvidenceSourcePartSchema = z.enum(['body', 'attachment'])

export const EvidenceRefSchema = z
  .object({
    evidenceId: IdSchema,
    exactText: z.string(),
    sourcePart: EvidenceSourcePartSchema,
    attachmentId: IdSchema.nullable(),
    exactMatch: z.boolean(),
    startOffset: z.number().int().nonnegative().nullable(),
    endOffset: z.number().int().nonnegative().nullable(),
    sourceLineIndex: z.number().int().nonnegative().nullable(),
  })
  .strict()
  .superRefine((evidence, context) => {
    if (evidence.sourcePart === 'body' && evidence.attachmentId !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Body evidence requires attachmentId=null.',
        path: ['attachmentId'],
      })
    }

    if (evidence.sourcePart === 'attachment' && evidence.attachmentId === null) {
      context.addIssue({
        code: 'custom',
        message: 'Attachment evidence requires attachmentId.',
        path: ['attachmentId'],
      })
    }

    const hasStartOffset = evidence.startOffset !== null
    const hasEndOffset = evidence.endOffset !== null

    if (hasStartOffset !== hasEndOffset) {
      context.addIssue({
        code: 'custom',
        message: 'Evidence offsets must both exist or both be null.',
        path: ['startOffset'],
      })
    }

    if (hasStartOffset && hasEndOffset) {
      if (evidence.endOffset < evidence.startOffset) {
        context.addIssue({
          code: 'custom',
          message: 'endOffset must be greater than or equal to startOffset.',
          path: ['endOffset'],
        })
      }

      if (!evidence.exactMatch) {
        context.addIssue({
          code: 'custom',
          message: 'Evidence with offsets requires exactMatch=true.',
          path: ['exactMatch'],
        })
      }
    }

    if (evidence.exactText === '' && evidence.exactMatch) {
      context.addIssue({
        code: 'custom',
        message: 'Empty exactText requires exactMatch=false.',
        path: ['exactMatch'],
      })
    }
  })

export const DomainWarningSchema = z
  .object({
    type: NonEmptyStringSchema,
    message: NonEmptyStringSchema,
    itemId: IdSchema.nullable(),
    candidateId: IdSchema.nullable(),
  })
  .strict()

export const ExtractionItemKindSchema = z.enum([
  'deadline',
  'task',
  'submission',
  'requirement',
  'caution',
])

export const ExtractionItemMethodSchema = z.enum(['ai', 'rule', 'manual'])

export const ExtractionMethodSchema = z.enum([
  'ai',
  'rule',
  'hybrid',
  'manual',
])

export const ExtractionItemSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    itemId: IdSchema,
    extractionId: IdSchema,
    sourceNoticeId: IdSchema,
    kind: ExtractionItemKindSchema,
    title: NonEmptyStringSchema,
    description: z.string(),
    dateExpression: z.string(),
    normalizedDate: IsoDateSchema.nullable(),
    timeExpression: z.string(),
    normalizedTime: IsoTimeSchema.nullable(),
    evidence: z.array(EvidenceRefSchema),
    confidence: ConfidenceSchema,
    reviewRequired: z.boolean(),
    reviewReasons: createUniquePrimitiveArraySchema(ReviewReasonSchema, {
      message: 'Expected unique review reasons.',
    }),
    extractionMethod: ExtractionItemMethodSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((item, context) => {
    if (item.normalizedTime !== null && item.normalizedDate === null) {
      context.addIssue({
        code: 'custom',
        message: 'normalizedTime requires normalizedDate.',
        path: ['normalizedDate'],
      })
    }

    addReviewStateIssue(item, context)
  })

export const EventSubtypeSchema = z.enum([
  'application_deadline',
  'submission_deadline',
  'payment_deadline',
  'general_deadline',
  'application_start',
  'registration_start',
  'result_announcement',
  'information_meeting',
  'other',
])

export const CandidateStatusSchema = z.enum([
  'pending',
  'auto_eligible',
  'approved',
  'rejected',
  'suppressed',
])

export const CalendarEventCandidateSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    candidateId: IdSchema,
    extractionId: IdSchema,
    sourceNoticeId: IdSchema,
    relatedItemId: IdSchema.nullable(),
    sourceCandidateKey: NonEmptyStringSchema.nullable(),
    title: NonEmptyStringSchema,
    description: z.string(),
    eventType: EventTypeSchema,
    eventSubtype: EventSubtypeSchema.nullable(),
    targetActor: TargetActorSchema,
    dateExpression: z.string(),
    normalizedDate: IsoDateSchema.nullable(),
    timeExpression: z.string(),
    normalizedTime: IsoTimeSchema.nullable(),
    timezone: TimezoneSchema.nullable(),
    isAllDay: z.boolean().nullable(),
    evidence: z.array(EvidenceRefSchema),
    confidence: ConfidenceSchema,
    reviewRequired: z.boolean(),
    reviewReasons: createUniquePrimitiveArraySchema(ReviewReasonSchema, {
      message: 'Expected unique review reasons.',
    }),
    candidateStatus: CandidateStatusSchema,
    suppressionReason: NonEmptyStringSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((candidate, context) => {
    if (candidate.normalizedTime !== null && candidate.normalizedDate === null) {
      context.addIssue({
        code: 'custom',
        message: 'normalizedTime requires normalizedDate.',
        path: ['normalizedDate'],
      })
    }

    if (candidate.isAllDay === true) {
      if (candidate.normalizedTime !== null) {
        context.addIssue({
          code: 'custom',
          message: 'An all-day candidate requires normalizedTime=null.',
          path: ['normalizedTime'],
        })
      }

      if (candidate.timezone !== null) {
        context.addIssue({
          code: 'custom',
          message: 'An all-day candidate requires timezone=null.',
          path: ['timezone'],
        })
      }
    }

    if (candidate.isAllDay === false) {
      const requiredTimedFields = [
        ['normalizedDate', candidate.normalizedDate],
        ['normalizedTime', candidate.normalizedTime],
        ['timezone', candidate.timezone],
      ]

      requiredTimedFields.forEach(([fieldName, value]) => {
        if (value === null) {
          context.addIssue({
            code: 'custom',
            message: `A timed candidate requires ${fieldName}.`,
            path: [fieldName],
          })
        }
      })
    }

    if (
      candidate.candidateStatus === 'suppressed' &&
      candidate.suppressionReason === null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A suppressed candidate requires suppressionReason.',
        path: ['suppressionReason'],
      })
    }

    if (
      candidate.candidateStatus !== 'suppressed' &&
      candidate.suppressionReason !== null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Only a suppressed candidate may include suppressionReason.',
        path: ['suppressionReason'],
      })
    }

    addReviewStateIssue(candidate, context)
  })

export const DetectedLanguageSchema = z.enum(['ko', 'en', 'mixed', 'unknown'])

export const ExtractionResultStatusSchema = z.enum([
  'completed',
  'partial',
  'failed',
])

export const ExtractionResultSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    extractionId: IdSchema,
    sourceNoticeId: IdSchema,
    extractionMethod: ExtractionMethodSchema,
    sourceContentHash: HashSchema,
    provider: z.string().nullable(),
    model: z.string().nullable(),
    promptVersion: z.string().nullable(),
    extractorVersion: z.string().nullable(),
    schemaContractVersion: z.literal('noticepilot.domain.v1'),
    summary: z.string(),
    inferredTitle: z.string().nullable(),
    detectedNoticeType: NoticeTypeSchema,
    detectedLanguage: DetectedLanguageSchema,
    items: z.array(ExtractionItemSchema),
    calendarEventCandidates: z.array(CalendarEventCandidateSchema),
    warnings: z.array(DomainWarningSchema),
    status: ExtractionResultStatusSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((result, context) => {
    const itemIds = new Set(result.items.map((item) => item.itemId))
    const candidateIds = new Set(
      result.calendarEventCandidates.map((candidate) => candidate.candidateId),
    )

    result.items.forEach((item, index) => {
      if (item.extractionId !== result.extractionId) {
        context.addIssue({
          code: 'custom',
          message: 'Child extractionId must match the parent extractionId.',
          path: ['items', index, 'extractionId'],
        })
      }

      if (item.sourceNoticeId !== result.sourceNoticeId) {
        context.addIssue({
          code: 'custom',
          message: 'Child sourceNoticeId must match the parent sourceNoticeId.',
          path: ['items', index, 'sourceNoticeId'],
        })
      }
    })

    if (itemIds.size !== result.items.length) {
      context.addIssue({
        code: 'custom',
        message: 'Expected unique item IDs.',
        path: ['items'],
      })
    }

    result.calendarEventCandidates.forEach((candidate, index) => {
      if (candidate.extractionId !== result.extractionId) {
        context.addIssue({
          code: 'custom',
          message: 'Child extractionId must match the parent extractionId.',
          path: ['calendarEventCandidates', index, 'extractionId'],
        })
      }

      if (candidate.sourceNoticeId !== result.sourceNoticeId) {
        context.addIssue({
          code: 'custom',
          message: 'Child sourceNoticeId must match the parent sourceNoticeId.',
          path: ['calendarEventCandidates', index, 'sourceNoticeId'],
        })
      }

      if (candidate.relatedItemId !== null && !itemIds.has(candidate.relatedItemId)) {
        context.addIssue({
          code: 'custom',
          message: 'relatedItemId must reference an item in the same result.',
          path: ['calendarEventCandidates', index, 'relatedItemId'],
        })
      }
    })

    if (candidateIds.size !== result.calendarEventCandidates.length) {
      context.addIssue({
        code: 'custom',
        message: 'Expected unique candidate IDs.',
        path: ['calendarEventCandidates'],
      })
    }

    result.warnings.forEach((warning, index) => {
      if (warning.itemId !== null && !itemIds.has(warning.itemId)) {
        context.addIssue({
          code: 'custom',
          message: 'Warning itemId must reference an item in the same result.',
          path: ['warnings', index, 'itemId'],
        })
      }

      if (warning.candidateId !== null && !candidateIds.has(warning.candidateId)) {
        context.addIssue({
          code: 'custom',
          message: 'Warning candidateId must reference a candidate in the same result.',
          path: ['warnings', index, 'candidateId'],
        })
      }
    })

    if (
      result.status === 'failed' &&
      (result.items.length > 0 || result.calendarEventCandidates.length > 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A failed extraction result requires empty item and candidate arrays.',
        path: ['status'],
      })
    }
  })

export function parseEvidenceRef(input) {
  return EvidenceRefSchema.parse(input)
}

export function safeParseEvidenceRef(input) {
  return EvidenceRefSchema.safeParse(input)
}

export function parseDomainWarning(input) {
  return DomainWarningSchema.parse(input)
}

export function safeParseDomainWarning(input) {
  return DomainWarningSchema.safeParse(input)
}

export function parseExtractionItem(input) {
  return ExtractionItemSchema.parse(input)
}

export function safeParseExtractionItem(input) {
  return ExtractionItemSchema.safeParse(input)
}

export function parseCalendarEventCandidate(input) {
  return CalendarEventCandidateSchema.parse(input)
}

export function safeParseCalendarEventCandidate(input) {
  return CalendarEventCandidateSchema.safeParse(input)
}

export function parseExtractionResult(input) {
  return ExtractionResultSchema.parse(input)
}

export function safeParseExtractionResult(input) {
  return ExtractionResultSchema.safeParse(input)
}
