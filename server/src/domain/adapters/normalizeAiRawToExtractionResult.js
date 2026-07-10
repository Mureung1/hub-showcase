import { z } from 'zod'
import { AiRawAnalysisSchema } from '../../schemas/aiRawSchema.js'
import { CanonicalNoticeSchema } from '../schemas/canonicalNoticeSchema.js'
import { parseExtractionResult } from '../schemas/extractionSchema.js'
import {
  AdapterContextSchema,
  createAdapterId,
} from './adapterContext.js'

export const LegacyAiExtractionMetadataSchema = z
  .object({
    provider: z.string().nullable(),
    model: z.string().nullable(),
    promptVersion: z.string().nullable(),
    extractorVersion: z.string().nullable(),
  })
  .strict()

const AiRawExtractionAdapterArgumentsSchema = z
  .object({
    aiRawAnalysis: AiRawAnalysisSchema,
    canonicalNotice: CanonicalNoticeSchema,
    extractionMetadata: LegacyAiExtractionMetadataSchema,
    context: AdapterContextSchema,
  })
  .strict()

function addUniqueReviewReason(reviewReasons, reason) {
  if (!reviewReasons.includes(reason)) {
    reviewReasons.push(reason)
  }
}

function normalizeLegacyDate(normalizedDate) {
  return normalizedDate === '' ? null : normalizedDate
}

function createEvidenceConversion(evidenceText, canonicalText, context) {
  if (evidenceText === '') {
    return {
      evidence: [],
      missing: true,
      exactMatch: false,
    }
  }

  const startOffset = canonicalText.indexOf(evidenceText)
  const exactMatch = startOffset >= 0

  return {
    evidence: [
      {
        evidenceId: createAdapterId(context, 'evidence'),
        exactText: evidenceText,
        sourcePart: 'body',
        attachmentId: null,
        exactMatch,
        startOffset: exactMatch ? startOffset : null,
        endOffset: exactMatch ? startOffset + evidenceText.length : null,
        sourceLineIndex: null,
      },
    ],
    missing: false,
    exactMatch,
  }
}

function createReviewEnrichment({
  normalizedDate,
  evidenceConversion,
  confidence,
  targetActor,
  legacyReviewRequired,
}) {
  const reviewReasons = []

  if (normalizedDate === null) {
    addUniqueReviewReason(reviewReasons, 'ambiguous_date')
  }

  if (evidenceConversion.missing) {
    addUniqueReviewReason(reviewReasons, 'missing_evidence')
  } else if (!evidenceConversion.exactMatch) {
    addUniqueReviewReason(reviewReasons, 'evidence_not_exact')
  }

  if (confidence === 'low') {
    addUniqueReviewReason(reviewReasons, 'low_confidence')
  }

  if (targetActor === 'unknown') {
    addUniqueReviewReason(reviewReasons, 'unknown_actor')
  }

  const reviewReasonUnspecified = legacyReviewRequired && reviewReasons.length === 0

  if (reviewReasonUnspecified) {
    addUniqueReviewReason(reviewReasons, 'other')
  }

  return {
    reviewRequired: reviewReasons.length > 0,
    reviewReasons,
    reviewReasonUnspecified,
  }
}

function createUnspecifiedReviewWarning({ itemId = null, candidateId = null }) {
  return {
    type: 'ai_review_reason_unspecified',
    message: 'Legacy AI requested review without a specific deterministic reason.',
    itemId,
    candidateId,
  }
}

function normalizeLegacyWarning(warning) {
  const message = typeof warning === 'string' ? warning : warning.message

  if (!message.trim()) {
    return null
  }

  const legacyType = typeof warning === 'string' ? '' : warning.type || ''

  return {
    type: legacyType.trim() || 'legacy_ai_warning',
    message,
    itemId: null,
    candidateId: null,
  }
}

export function normalizeAiRawToExtractionResult(input) {
  const { aiRawAnalysis, canonicalNotice, extractionMetadata, context } =
    AiRawExtractionAdapterArgumentsSchema.parse(input)

  const extractionId = createAdapterId(context, 'extraction')
  const generatedWarnings = []

  const items = aiRawAnalysis.items.map((rawItem) => {
    const itemId = createAdapterId(context, 'extraction_item')
    const normalizedDate = normalizeLegacyDate(rawItem.normalizedDate)
    const evidenceConversion = createEvidenceConversion(
      rawItem.evidence,
      canonicalNotice.normalizedText,
      context,
    )
    const review = createReviewEnrichment({
      normalizedDate,
      evidenceConversion,
      confidence: rawItem.confidence,
      targetActor: null,
      legacyReviewRequired: rawItem.reviewRequired,
    })

    if (review.reviewReasonUnspecified) {
      generatedWarnings.push(createUnspecifiedReviewWarning({ itemId }))
    }

    return {
      schemaVersion: 1,
      itemId,
      extractionId,
      sourceNoticeId: canonicalNotice.noticeId,
      kind: rawItem.kind,
      title: rawItem.title,
      description: rawItem.description,
      dateExpression: rawItem.dateExpression,
      normalizedDate,
      timeExpression: '',
      normalizedTime: null,
      evidence: evidenceConversion.evidence,
      confidence: rawItem.confidence,
      reviewRequired: review.reviewRequired,
      reviewReasons: review.reviewReasons,
      extractionMethod: 'ai',
      createdAt: context.now,
    }
  })

  const calendarEventCandidates = aiRawAnalysis.calendarEventCandidates.map(
    (rawCandidate) => {
      const candidateId = createAdapterId(context, 'calendar_event_candidate')
      const normalizedDate = normalizeLegacyDate(rawCandidate.normalizedDate)
      const evidenceConversion = createEvidenceConversion(
        rawCandidate.evidence,
        canonicalNotice.normalizedText,
        context,
      )
      const review = createReviewEnrichment({
        normalizedDate,
        evidenceConversion,
        confidence: rawCandidate.confidence,
        targetActor: 'unknown',
        legacyReviewRequired: rawCandidate.reviewRequired,
      })

      if (review.reviewReasonUnspecified) {
        generatedWarnings.push(
          createUnspecifiedReviewWarning({ candidateId }),
        )
      }

      return {
        schemaVersion: 1,
        candidateId,
        extractionId,
        sourceNoticeId: canonicalNotice.noticeId,
        relatedItemId: null,
        sourceCandidateKey: null,
        title: rawCandidate.title,
        description: '',
        eventType: rawCandidate.eventType,
        eventSubtype: null,
        targetActor: 'unknown',
        dateExpression: rawCandidate.dateExpression,
        normalizedDate,
        timeExpression: '',
        normalizedTime: null,
        timezone: null,
        isAllDay:
          normalizedDate !== null &&
          (rawCandidate.eventType === 'deadline' ||
            rawCandidate.eventType === 'start')
            ? true
            : null,
        evidence: evidenceConversion.evidence,
        confidence: rawCandidate.confidence,
        reviewRequired: review.reviewRequired,
        reviewReasons: review.reviewReasons,
        candidateStatus: 'pending',
        suppressionReason: null,
        createdAt: context.now,
        updatedAt: context.now,
      }
    },
  )

  const legacyWarnings = aiRawAnalysis.warnings
    .map(normalizeLegacyWarning)
    .filter((warning) => warning !== null)

  return parseExtractionResult({
    schemaVersion: 1,
    extractionId,
    sourceNoticeId: canonicalNotice.noticeId,
    extractionMethod: 'ai',
    sourceContentHash: canonicalNotice.contentHash,
    provider: extractionMetadata.provider,
    model: extractionMetadata.model,
    promptVersion: extractionMetadata.promptVersion,
    extractorVersion: extractionMetadata.extractorVersion,
    schemaContractVersion: 'noticepilot.domain.v1',
    summary: aiRawAnalysis.summary,
    inferredTitle: null,
    detectedNoticeType: 'unknown',
    detectedLanguage: 'unknown',
    items,
    calendarEventCandidates,
    warnings: [...legacyWarnings, ...generatedWarnings],
    status: 'completed',
    createdAt: context.now,
  })
}
