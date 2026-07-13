import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAdapterContext,
  createCanonicalNotice,
  createExtractionMetadata,
} from '../../domain/adapters/__tests__/fixtures.js'
import { safeParseAppAnalysis } from '../../schemas/appAnalysisSchema.js'
import { normalizeAiRawToAppResult } from '../normalizeAiRawToAppResult.js'

function createAiRawAnalysis(overrides = {}) {
  return {
    summary: 'Legacy summary',
    items: [
      {
        kind: 'deadline',
        title: 'Application deadline',
        description: 'Submit online.',
        dateExpression: '2026-07-20',
        normalizedDate: '2026-07-20',
        evidence: 'Applications close on 2026-07-20.',
        confidence: 'high',
        reviewRequired: false,
      },
    ],
    calendarEventCandidates: [
      {
        title: 'Application deadline',
        eventType: 'deadline',
        dateExpression: '2026-07-20',
        normalizedDate: '2026-07-20',
        evidence: 'Applications close on 2026-07-20.',
        confidence: 'high',
        reviewRequired: false,
      },
    ],
    warnings: [{ type: 'legacy_warning', message: 'Legacy warning' }],
    ...overrides,
  }
}

function createLegacyOptions(overrides = {}) {
  return {
    noticeTitle: 'Application notice',
    detectedNoticeType: 'scholarship',
    userSelectedNoticeType: 'scholarship',
    noticePublicationDate: '2026-07-01',
    uploadedFileName: 'notice.txt',
    referenceDate: '2026-07-01',
    ...overrides,
  }
}

function createDomainAdapterOption(overrides = {}) {
  return {
    canonicalNotice: createCanonicalNotice({
      normalizedText: 'Applications close on 2026-07-20.',
    }),
    context: createAdapterContext(),
    extractionMetadata: createExtractionMetadata(),
    ...overrides,
  }
}

test('default invocation preserves the legacy normalization path', () => {
  let unrelatedContextCalls = 0
  const result = normalizeAiRawToAppResult(
    createAiRawAnalysis(),
    createLegacyOptions({
      adapterContext: {
        idFactory: () => {
          unrelatedContextCalls += 1
          throw new Error('must not be called')
        },
      },
    }),
  )

  assert.equal(unrelatedContextCalls, 0)
  assert.equal(result.title, 'Application notice')
  assert.equal(result.detectedNoticeType, 'scholarship')
  assert.equal(result.deadlines[0].date, '2026-07-20')
  assert.equal(result.calendarEvents[0].dateSource, 'ai_raw')
  assert.equal(result.calendarEvents[0].selected, true)
  assert.equal(result.calendarEvents[0].reviewRequired, false)
  assert.deepEqual(result.warnings, [
    { type: 'legacy_warning', message: 'Legacy warning' },
  ])
  assert.equal(safeParseAppAnalysis(result).success, true)
})

test('legacy validation error behavior remains available', () => {
  assert.throws(
    () => normalizeAiRawToAppResult({ summary: 'invalid' }),
    (error) => error.validationCode === 'AI_RAW_SCHEMA_INVALID',
  )
})

test('complete domainAdapter option runs the domain pipeline', () => {
  const snapshot = {
    activeInstitution: 'kangwon',
    selectedCampuses: ['chuncheon'],
    includeCommonNotices: true,
  }
  const result = normalizeAiRawToAppResult(
    createAiRawAnalysis(),
    createLegacyOptions({
      domainAdapter: createDomainAdapterOption(),
      userPreferencesSnapshot: snapshot,
    }),
  )

  assert.equal(result.title, 'Application notice')
  assert.equal(result.detectedNoticeType, 'scholarship')
  assert.equal(result.userSelectedNoticeType, 'scholarship')
  assert.equal(result.noticePublicationDate, '2026-07-01')
  assert.equal(result.uploadedFileName, 'notice.txt')
  assert.equal(result.deadlines[0].evidence, 'Applications close on 2026-07-20.')
  assert.equal(result.calendarEvents[0].dateSource, 'core_extraction')
  assert.equal(result.calendarEvents[0].referenceDate, '2026-07-01')
  assert.equal(result.calendarEvents[0].reviewRequired, true)
  assert.equal(result.calendarEvents[0].selected, true)
  assert.deepEqual(result.metadata.userPreferencesSnapshot, snapshot)
  assert.equal(safeParseAppAnalysis(result).success, true)
})

test('domain path uses core detected notice type without an override', () => {
  const result = normalizeAiRawToAppResult(createAiRawAnalysis(), {
    noticeTitle: 'Application notice',
    domainAdapter: createDomainAdapterOption(),
  })

  assert.equal(result.detectedNoticeType, 'unknown')
})

test('null, partial, extra, and invalid domainAdapter options are rejected', () => {
  const validDomainAdapter = createDomainAdapterOption()

  for (const domainAdapter of [
    null,
    { canonicalNotice: validDomainAdapter.canonicalNotice },
    { ...validDomainAdapter, extra: true },
    {
      ...validDomainAdapter,
      context: createAdapterContext({ now: '2026-07-10T10:00:00' }),
    },
    {
      ...validDomainAdapter,
      canonicalNotice: { ...validDomainAdapter.canonicalNotice, revision: 0 },
    },
    {
      ...validDomainAdapter,
      extractionMetadata: {
        ...validDomainAdapter.extractionMetadata,
        unexpected: true,
      },
    },
  ]) {
    assert.throws(() =>
      normalizeAiRawToAppResult(createAiRawAnalysis(), {
        domainAdapter,
      }),
    )
  }
})

test('legacy and domain paths do not mutate caller input', () => {
  const aiRawAnalysis = createAiRawAnalysis()
  const legacyBefore = structuredClone(aiRawAnalysis)
  normalizeAiRawToAppResult(aiRawAnalysis, createLegacyOptions())
  assert.deepEqual(aiRawAnalysis, legacyBefore)

  const domainAdapter = createDomainAdapterOption()
  const domainBefore = {
    aiRawAnalysis: structuredClone(aiRawAnalysis),
    canonicalNotice: structuredClone(domainAdapter.canonicalNotice),
    extractionMetadata: structuredClone(domainAdapter.extractionMetadata),
  }
  normalizeAiRawToAppResult(aiRawAnalysis, {
    ...createLegacyOptions(),
    domainAdapter,
  })

  assert.deepEqual(aiRawAnalysis, domainBefore.aiRawAnalysis)
  assert.deepEqual(domainAdapter.canonicalNotice, domainBefore.canonicalNotice)
  assert.deepEqual(
    domainAdapter.extractionMetadata,
    domainBefore.extractionMetadata,
  )
})
