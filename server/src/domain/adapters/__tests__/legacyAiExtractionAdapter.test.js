import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LegacyAiExtractionMetadataSchema,
  normalizeAiRawToExtractionResult,
} from '../index.js'
import {
  createAdapterContext,
  createAiRawAnalysis,
  createCanonicalNotice,
  createExtractionMetadata,
} from './fixtures.js'

function createRawItem(overrides = {}) {
  return {
    kind: 'deadline',
    title: 'Legacy item',
    description: '',
    dateExpression: '2026-07-20',
    normalizedDate: '2026-07-20',
    evidence: 'Exact evidence',
    confidence: 'high',
    reviewRequired: false,
    ...overrides,
  }
}

function createRawCandidate(overrides = {}) {
  return {
    title: 'Legacy candidate',
    eventType: 'deadline',
    dateExpression: '2026-07-20',
    normalizedDate: '2026-07-20',
    evidence: 'Exact evidence',
    confidence: 'high',
    reviewRequired: false,
    ...overrides,
  }
}

function normalize({ aiRawAnalysis, canonicalNotice, metadata, context } = {}) {
  return normalizeAiRawToExtractionResult({
    aiRawAnalysis: aiRawAnalysis || createAiRawAnalysis(),
    canonicalNotice: canonicalNotice ||
      createCanonicalNotice({ normalizedText: 'Exact evidence' }),
    extractionMetadata: metadata || createExtractionMetadata(),
    context: context || createAdapterContext(),
  })
}

test('exact evidence uses the first canonical body occurrence and offsets', () => {
  const evidence = 'Repeated evidence'
  const canonicalText = `${evidence}\nMiddle\n${evidence}`
  const result = normalize({
    canonicalNotice: createCanonicalNotice({ normalizedText: canonicalText }),
    aiRawAnalysis: createAiRawAnalysis({
      items: [createRawItem({ evidence })],
    }),
  })
  const evidenceRef = result.items[0].evidence[0]

  assert.equal(evidenceRef.sourcePart, 'body')
  assert.equal(evidenceRef.attachmentId, null)
  assert.equal(evidenceRef.exactMatch, true)
  assert.equal(evidenceRef.startOffset, 0)
  assert.equal(evidenceRef.endOffset, evidence.length)
})

test('missing date/evidence and low confidence enrich review in fixed order', () => {
  const result = normalize({
    aiRawAnalysis: createAiRawAnalysis({
      items: [
        createRawItem({
          normalizedDate: '',
          evidence: '',
          confidence: 'low',
          reviewRequired: false,
        }),
      ],
    }),
  })
  const item = result.items[0]

  assert.equal(item.normalizedDate, null)
  assert.deepEqual(item.evidence, [])
  assert.deepEqual(item.reviewReasons, [
    'ambiguous_date',
    'missing_evidence',
    'low_confidence',
  ])
  assert.equal(item.reviewRequired, true)
})

test('non-exact evidence is preserved without offsets and requires review', () => {
  const result = normalize({
    aiRawAnalysis: createAiRawAnalysis({
      items: [createRawItem({ evidence: 'Not in canonical text' })],
    }),
  })
  const item = result.items[0]

  assert.deepEqual(item.reviewReasons, ['evidence_not_exact'])
  assert.equal(item.evidence[0].exactMatch, false)
  assert.equal(item.evidence[0].startOffset, null)
  assert.equal(item.evidence[0].endOffset, null)
})

test('unspecified legacy review creates other reason and a referenced warning', () => {
  const result = normalize({
    aiRawAnalysis: createAiRawAnalysis({
      items: [createRawItem({ reviewRequired: true })],
    }),
  })
  const item = result.items[0]
  const warning = result.warnings[0]

  assert.deepEqual(item.reviewReasons, ['other'])
  assert.equal(item.reviewRequired, true)
  assert.equal(warning.type, 'ai_review_reason_unspecified')
  assert.equal(warning.itemId, item.itemId)
  assert.equal(warning.candidateId, null)
})

test('legacy candidate defaults preserve conservative temporal state', () => {
  const result = normalize({
    aiRawAnalysis: createAiRawAnalysis({
      calendarEventCandidates: [
        createRawCandidate({ title: 'Deadline', eventType: 'deadline' }),
        createRawCandidate({ title: 'Start', eventType: 'start' }),
        createRawCandidate({ title: 'Meeting', eventType: 'meeting' }),
        createRawCandidate({
          title: 'Undated deadline',
          eventType: 'deadline',
          normalizedDate: '',
        }),
      ],
    }),
  })
  const [deadline, start, meeting, undated] = result.calendarEventCandidates

  for (const candidate of result.calendarEventCandidates) {
    assert.equal(candidate.targetActor, 'unknown')
    assert.equal(candidate.eventSubtype, null)
    assert.equal(candidate.normalizedTime, null)
    assert.equal(candidate.timezone, null)
    assert.equal(candidate.candidateStatus, 'pending')
    assert.equal(candidate.suppressionReason, null)
    assert.equal(candidate.reviewReasons.includes('unknown_actor'), true)
  }

  assert.equal(deadline.isAllDay, true)
  assert.equal(start.isAllDay, true)
  assert.equal(meeting.isAllDay, null)
  assert.equal(undated.isAllDay, null)
  assert.deepEqual(undated.reviewReasons, ['ambiguous_date', 'unknown_actor'])
})

test('legacy warnings become global warnings and blank messages are dropped', () => {
  const result = normalize({
    aiRawAnalysis: createAiRawAnalysis({
      warnings: [
        'String warning',
        { type: 'provider_warning', message: 'Object warning' },
        { type: '', message: 'Fallback type' },
        '',
        { type: 'empty_warning', message: '' },
      ],
    }),
  })

  assert.deepEqual(
    result.warnings.map((warning) => warning.type),
    ['legacy_ai_warning', 'provider_warning', 'legacy_ai_warning'],
  )
  assert.equal(
    result.warnings.every(
      (warning) => warning.itemId === null && warning.candidateId === null,
    ),
    true,
  )
})

test('result metadata and fixed legacy defaults are preserved', () => {
  const metadata = createExtractionMetadata({ provider: null, model: null })
  const canonicalNotice = createCanonicalNotice({ contentHash: 'source-hash' })
  const result = normalize({ metadata, canonicalNotice })

  assert.equal(result.sourceContentHash, 'source-hash')
  assert.equal(result.extractionMethod, 'ai')
  assert.equal(result.schemaContractVersion, 'noticepilot.domain.v1')
  assert.equal(result.detectedNoticeType, 'unknown')
  assert.equal(result.detectedLanguage, 'unknown')
  assert.equal(result.inferredTitle, null)
  assert.equal(result.provider, null)
  assert.equal(result.model, null)
})

test('metadata and adapter arguments are strict', () => {
  const metadata = createExtractionMetadata()
  assert.equal(LegacyAiExtractionMetadataSchema.safeParse(metadata).success, true)
  assert.equal(
    LegacyAiExtractionMetadataSchema.safeParse({ ...metadata, extra: true }).success,
    false,
  )

  assert.throws(() =>
    normalizeAiRawToExtractionResult({
      aiRawAnalysis: createAiRawAnalysis(),
      canonicalNotice: createCanonicalNotice(),
      extractionMetadata: metadata,
      context: createAdapterContext(),
      extra: true,
    }),
  )
})

test('invalid injected IDs and invalid core-required titles fail', () => {
  assert.throws(() =>
    normalize({ context: createAdapterContext({ idFactory: () => '   ' }) }),
  )
  assert.throws(() =>
    normalize({
      aiRawAnalysis: createAiRawAnalysis({
        items: [createRawItem({ title: '' })],
      }),
    }),
  )
})
