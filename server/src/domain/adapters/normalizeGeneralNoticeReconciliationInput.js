import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createInterface } from 'node:readline'

import { normalizeCrawledNoticeToCanonical } from './normalizeCrawledNoticeToCanonical.js'
import { normalizeKnuRuleCandidatesToExtractionResult } from './normalizeKnuRuleCandidatesToExtractionResult.js'
import { normalizeKnuV044ToCrawledNotice } from './normalizeKnuV044ToCrawledNotice.js'

export const GENERAL_NOTICE_RECONCILIATION_INPUT_SCHEMA =
  'noticepilot.generalNoticeReconciliationInput.v0.1'

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function createDeterministicContext(normalizedNotice, candidatePayload) {
  const seed = sha256(
    canonicalJson({
      noticeId: normalizedNotice.noticeId,
      contentHash: normalizedNotice.contentHash,
      candidatePayload,
    }),
  )
  let counter = 0
  return {
    now: candidatePayload.extractor.createdAt,
    idFactory: (entityType) => {
      counter += 1
      return `${entityType}-${sha256(`${seed}:${entityType}:${counter}`).slice(0, 32)}`
    },
    hashText: (text) => sha256(String(text)),
  }
}

function assertCandidateCorrespondence(candidatePayload, extractionResult) {
  const extractionByKey = new Map(
    extractionResult.calendarEventCandidates.map((candidate) => [
      candidate.sourceCandidateKey,
      candidate,
    ]),
  )
  if (extractionByKey.size !== candidatePayload.candidates.length) {
    throw new TypeError('ExtractionResult candidate correspondence is not one-to-one.')
  }

  return candidatePayload.candidates.map((sourceCandidate) => {
    const extractionCandidate = extractionByKey.get(sourceCandidate.id)
    if (!extractionCandidate) {
      throw new TypeError('ExtractionResult is missing a source candidate mapping.')
    }
    if (
      sourceCandidate.status === 'auto_confirmed' &&
      sourceCandidate.includeInCalendarFeed === true &&
      extractionCandidate.reviewRequired !== false
    ) {
      throw new TypeError('A promoted source candidate cannot gain review requirements.')
    }
    return {
      sourceCandidateId: sourceCandidate.id,
      disposition:
        sourceCandidate.status === 'auto_confirmed' &&
        sourceCandidate.includeInCalendarFeed === true &&
        extractionCandidate.reviewRequired === false
          ? 'eligible_for_reconciliation'
          : 'requires_review',
    }
  })
}

/**
 * Reuses the existing KNU adapters and only adds the approved batch-scoped
 * contract around their output.  It deliberately does not promote pending
 * ExtractionResult candidates or reinterpret dates.
 */
export function normalizeGeneralNoticeReconciliationInput({
  normalizedNotice,
  candidatePayload,
  boardRegistry,
}) {
  const context = createDeterministicContext(normalizedNotice, candidatePayload)
  const crawledNotice = normalizeKnuV044ToCrawledNotice({
    normalizedNotice,
    boardRegistry,
    context,
  })
  const canonicalNotice = normalizeCrawledNoticeToCanonical({
    crawledNotice,
    previousCanonicalNotice: null,
    campusResolution: null,
    noticeTypeResolution: null,
    context,
  })
  const extractionResult = normalizeKnuRuleCandidatesToExtractionResult({
    candidatePayload,
    canonicalNotice,
    context,
  })
  const candidateDispositions = assertCandidateCorrespondence(
    candidatePayload,
    extractionResult,
  )

  return {
    schemaVersion: GENERAL_NOTICE_RECONCILIATION_INPUT_SCHEMA,
    normalizedNotice,
    candidatePayload,
    extractionResult,
    candidateDispositions,
  }
}

async function runJsonLines() {
  const reader = createInterface({ input: process.stdin, crlfDelay: Infinity })
  for await (const line of reader) {
    if (line.trim() === '') continue
    try {
      const value = normalizeGeneralNoticeReconciliationInput(JSON.parse(line))
      process.stdout.write(`${JSON.stringify({ ok: true, value })}\n`)
    } catch {
      // The Python boundary intentionally receives no parser details.
      process.stdout.write(`${JSON.stringify({ ok: false, code: 'invalid_reconciliation_input' })}\n`)
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runJsonLines().catch(() => process.exitCode = 1)
}
