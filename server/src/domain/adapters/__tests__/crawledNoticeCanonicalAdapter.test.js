import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  CrawlerCampusResolutionSchema,
  CrawlerNoticeTypeResolutionSchema,
  normalizeCrawledNoticeToCanonical,
  normalizeKnuV044ToCrawledNotice,
} from '../index.js'
import { createAdapterContext } from './fixtures.js'

const ALL_CAMPUSES = [
  'chuncheon',
  'samcheok',
  'dogye',
  'gangneung_wonju',
]
const fixtureDirectory = new URL(
  '../../../../../test-corpus/fixtures/knu-crawler-v0.4.4/',
  import.meta.url,
)

function readJsonFixture(name) {
  return JSON.parse(readFileSync(new URL(name, fixtureDirectory), 'utf8'))
}

function createCrawledNotice(boardId = '720') {
  return normalizeKnuV044ToCrawledNotice({
    normalizedNotice: readJsonFixture(
      `normalized-notice-${boardId}.sample.json`,
    ),
    boardRegistry: readJsonFixture('knu-board-registry.v0.2.sample.json'),
    context: createAdapterContext(),
  })
}

function canonicalize(crawledNotice, overrides = {}) {
  return normalizeCrawledNoticeToCanonical({
    crawledNotice,
    previousCanonicalNotice: overrides.previousCanonicalNotice ?? null,
    campusResolution: overrides.campusResolution ?? null,
    noticeTypeResolution: overrides.noticeTypeResolution ?? null,
    context: overrides.context ?? createAdapterContext(),
  })
}

test('canonicalizes actual S15 board 720 and 721 outputs', () => {
  const academicSource = createCrawledNotice('720')
  const scholarshipSource = createCrawledNotice('721')
  const hashInputs = []
  const context = createAdapterContext({
    idFactory: (entityType) => {
      assert.equal(entityType, 'canonical_notice')
      return 'canonical-knu-720'
    },
    hashText: (input) => {
      hashInputs.push(input)
      return 'semantic-hash-720'
    },
  })

  const academic = canonicalize(academicSource, { context })
  const scholarship = canonicalize(scholarshipSource)

  assert.deepEqual(hashInputs, [academicSource.contentText])
  assert.equal(academic.noticeId, 'canonical-knu-720')
  assert.equal(academic.sourceKind, 'crawler')
  assert.equal(academic.sourceBoard.boardId, '720')
  assert.equal(academic.sourcePostId, academicSource.sourcePostId)
  assert.equal(academic.sourceUrl, academicSource.sourceUrl)
  assert.equal(academic.canonicalSourceUrl, academicSource.canonicalSourceUrl)
  assert.deepEqual(academic.attachments, academicSource.attachments)
  assert.equal(academic.normalizedText, academicSource.contentText)
  assert.equal(academic.contentHash, academicSource.contentHash)
  assert.equal(academic.semanticContentHash, 'semantic-hash-720')
  assert.equal(academic.boardCategory, 'school_notice')
  assert.equal(academic.noticeType, 'school_notice')
  assert.equal(academic.noticeTypeBasis, 'board_hint')
  assert.equal(academic.noticeTypeConflict, false)
  assert.deepEqual(academic.campus, {
    listedCampusClassification: academicSource.listedCampusClassification,
    targetScope: 'source_default',
    targetCampuses: ['samcheok'],
    excludedCampuses: [],
    targetCampusBasis: 'listed_campus_default',
    campusReviewRequired: false,
    campusReviewReasons: [],
  })
  assert.equal(academic.revision, 1)
  assert.equal(academic.createdAt, context.now)
  assert.equal(academic.updatedAt, context.now)
  assert.equal(academic.status, 'active')
  assert.equal(academic.supersededByNoticeId, null)

  assert.equal(scholarship.sourceBoard.boardId, '721')
  assert.equal(scholarship.noticeType, 'scholarship')
  assert.deepEqual(scholarship.campus.targetCampuses, ['gangneung_wonju'])
})

test('uses listed all, specific, and unknown campus fallbacks', () => {
  const allSource = createCrawledNotice()
  allSource.listedCampusClassification = {
    rawLabel: 'ALL',
    campuses: [...ALL_CAMPUSES],
    scope: 'all',
  }
  const allCampus = canonicalize(allSource).campus
  assert.equal(allCampus.targetScope, 'all')
  assert.deepEqual(allCampus.targetCampuses, ALL_CAMPUSES)
  assert.equal(allCampus.targetCampusBasis, 'listed_campus_default')
  assert.equal(allCampus.campusReviewRequired, false)

  const unknownSource = createCrawledNotice()
  unknownSource.listedCampusClassification = {
    rawLabel: null,
    campuses: [],
    scope: 'unknown',
  }
  assert.deepEqual(canonicalize(unknownSource).campus, {
    listedCampusClassification: unknownSource.listedCampusClassification,
    targetScope: 'unknown',
    targetCampuses: [],
    excludedCampuses: [],
    targetCampusBasis: 'unknown',
    campusReviewRequired: true,
    campusReviewReasons: ['target_campus_unresolved'],
  })
})

test('explicit campus resolution takes precedence and preserves conflicts', () => {
  const source = createCrawledNotice()
  const matching = canonicalize(source, {
    campusResolution: {
      targetScope: 'specific',
      targetCampuses: ['samcheok'],
      excludedCampuses: [],
    },
  }).campus
  assert.equal(matching.targetCampusBasis, 'explicit_text')
  assert.equal(matching.campusReviewRequired, false)

  const conflicting = canonicalize(source, {
    campusResolution: {
      targetScope: 'specific',
      targetCampuses: ['dogye'],
      excludedCampuses: ['samcheok'],
    },
  }).campus
  assert.deepEqual(conflicting.campusReviewReasons, [
    'source_target_campus_conflict',
  ])
  assert.equal(conflicting.campusReviewRequired, true)

  const unknownSource = createCrawledNotice()
  unknownSource.listedCampusClassification = {
    rawLabel: null,
    campuses: [],
    scope: 'unknown',
  }
  const resolvedUnknown = canonicalize(unknownSource, {
    campusResolution: {
      targetScope: 'specific',
      targetCampuses: ['dogye'],
      excludedCampuses: [],
    },
  }).campus
  assert.equal(resolvedUnknown.campusReviewRequired, false)
  assert.deepEqual(resolvedUnknown.campusReviewReasons, [])
})

test('campus conflict comparison ignores campus array order', () => {
  const source = createCrawledNotice()
  source.listedCampusClassification = {
    rawLabel: 'ALL',
    campuses: [...ALL_CAMPUSES],
    scope: 'all',
  }
  const campus = canonicalize(source, {
    campusResolution: {
      targetScope: 'all',
      targetCampuses: [...ALL_CAMPUSES].reverse(),
      excludedCampuses: [],
    },
  }).campus

  assert.equal(campus.campusReviewRequired, false)
  assert.deepEqual(campus.campusReviewReasons, [])
})

test('notice type resolution overrides board hints and records conflicts', () => {
  const source = createCrawledNotice()
  const sameType = canonicalize(source, {
    noticeTypeResolution: {
      noticeType: 'school_notice',
      noticeTypeBasis: 'ai',
    },
  })
  assert.equal(sameType.noticeTypeBasis, 'ai')
  assert.equal(sameType.noticeTypeConflict, false)

  const differentType = canonicalize(source, {
    noticeTypeResolution: {
      noticeType: 'competition',
      noticeTypeBasis: 'rule',
    },
  })
  assert.equal(differentType.noticeType, 'competition')
  assert.equal(differentType.noticeTypeBasis, 'rule')
  assert.equal(differentType.noticeTypeConflict, true)
  assert.equal(differentType.boardCategory, 'school_notice')

  const noHintSource = createCrawledNotice()
  delete noHintSource.sourceBoard.noticeTypeHint
  const noHint = canonicalize(noHintSource)
  assert.equal(noHint.noticeType, 'unknown')
  assert.equal(noHint.noticeTypeBasis, 'unknown')
  assert.equal(noHint.noticeTypeConflict, false)

  const resolvedNoHint = canonicalize(noHintSource, {
    noticeTypeResolution: {
      noticeType: 'competition',
      noticeTypeBasis: 'rule',
    },
  })
  assert.equal(resolvedNoHint.noticeTypeConflict, false)
})

test('uses title as semantic hash input only for empty content', () => {
  const source = createCrawledNotice()
  source.contentText = ''
  source.contentExtractionStatus = 'empty'
  const hashInputs = []

  const result = canonicalize(source, {
    context: createAdapterContext({
      hashText: (input) => {
        hashInputs.push(input)
        return 'title-semantic-hash'
      },
    }),
  })

  assert.deepEqual(hashInputs, [source.title])
  assert.equal(result.normalizedText, '')
  assert.equal(result.contentHash, source.contentHash)
  assert.equal(result.semanticContentHash, 'title-semantic-hash')
})

test('preserves identity and revision until source contentHash changes', () => {
  const source = createCrawledNotice()
  const first = canonicalize(source)
  const unchanged = canonicalize(source, {
    previousCanonicalNotice: first,
    context: createAdapterContext({
      now: '2026-07-10T11:00:00+09:00',
      idFactory: () => {
        throw new Error('idFactory must not run for an update')
      },
    }),
  })
  const changedSource = structuredClone(source)
  changedSource.contentHash = 'd'.repeat(64)
  const changed = canonicalize(changedSource, {
    previousCanonicalNotice: unchanged,
    context: createAdapterContext({ now: '2026-07-10T12:00:00+09:00' }),
  })

  assert.equal(unchanged.noticeId, first.noticeId)
  assert.equal(unchanged.revision, 1)
  assert.equal(unchanged.createdAt, first.createdAt)
  assert.equal(unchanged.updatedAt, '2026-07-10T11:00:00+09:00')
  assert.equal(changed.noticeId, first.noticeId)
  assert.equal(changed.revision, 2)
  assert.equal(changed.createdAt, first.createdAt)
  assert.equal(changed.updatedAt, '2026-07-10T12:00:00+09:00')
})

test('rejects invalid previous canonical notice state and identity', () => {
  const source = createCrawledNotice()
  const previous = canonicalize(source)
  const invalidPreviousNotices = [
    { ...previous, sourceKind: 'manual' },
    { ...previous, status: 'deleted' },
    {
      ...previous,
      status: 'superseded',
      supersededByNoticeId: 'replacement-notice',
    },
    { ...previous, sourcePostId: 'different-post' },
  ]

  for (const previousCanonicalNotice of invalidPreviousNotices) {
    assert.throws(() =>
      canonicalize(source, { previousCanonicalNotice }),
    )
  }
})

test('rejects non-active crawl states, failed content, and invalid identity', () => {
  for (const crawlStatus of ['missing', 'deleted', 'fetch_failed']) {
    const source = createCrawledNotice()
    source.crawlStatus = crawlStatus
    assert.throws(() => canonicalize(source))
  }

  const failedContent = createCrawledNotice()
  failedContent.contentExtractionStatus = 'failed'
  assert.throws(() => canonicalize(failedContent))

  const invalidIdentity = createCrawledNotice()
  invalidIdentity.sourceIdentityKey = 'kangwon:school_notice:different'
  assert.throws(() => canonicalize(invalidIdentity))
})

test('resolution schemas and adapter arguments are strict', () => {
  assert.equal(
    CrawlerCampusResolutionSchema.safeParse({
      targetScope: 'specific',
      targetCampuses: ['samcheok'],
      excludedCampuses: [],
    }).success,
    true,
  )
  assert.equal(
    CrawlerNoticeTypeResolutionSchema.safeParse({
      noticeType: 'scholarship',
      noticeTypeBasis: 'rule',
    }).success,
    true,
  )

  for (const campusResolution of [
    {
      targetScope: 'specific',
      targetCampuses: ['samcheok', 'samcheok'],
      excludedCampuses: [],
    },
    {
      targetScope: 'specific',
      targetCampuses: ['samcheok'],
      excludedCampuses: ['samcheok'],
    },
    {
      targetScope: 'all',
      targetCampuses: ['samcheok'],
      excludedCampuses: [],
    },
    {
      targetScope: 'specific',
      targetCampuses: [...ALL_CAMPUSES],
      excludedCampuses: [],
    },
  ]) {
    assert.equal(
      CrawlerCampusResolutionSchema.safeParse(campusResolution).success,
      false,
    )
  }

  assert.equal(
    CrawlerNoticeTypeResolutionSchema.safeParse({
      noticeType: 'scholarship',
      noticeTypeBasis: 'manual',
    }).success,
    false,
  )

  const source = createCrawledNotice()
  const validInput = {
    crawledNotice: source,
    previousCanonicalNotice: null,
    campusResolution: null,
    noticeTypeResolution: null,
    context: createAdapterContext(),
  }
  const { campusResolution, ...missingCampusResolution } = validInput
  assert.equal(campusResolution, null)
  assert.throws(() =>
    normalizeCrawledNoticeToCanonical(missingCampusResolution),
  )
  assert.throws(() =>
    normalizeCrawledNoticeToCanonical({ ...validInput, extra: true }),
  )
})

test('validates injected IDs and semantic hashes', () => {
  const source = createCrawledNotice()

  for (const context of [
    createAdapterContext({ idFactory: () => '   ' }),
    createAdapterContext({ hashText: () => '   ' }),
  ]) {
    assert.throws(() => canonicalize(source, { context }))
  }
})

test('does not mutate crawler, previous, or resolution inputs', () => {
  const source = createCrawledNotice()
  const previous = canonicalize(source)
  const campusResolution = {
    targetScope: 'specific',
    targetCampuses: ['samcheok'],
    excludedCampuses: [],
  }
  const noticeTypeResolution = {
    noticeType: 'school_notice',
    noticeTypeBasis: 'rule',
  }
  const snapshots = [
    structuredClone(source),
    structuredClone(previous),
    structuredClone(campusResolution),
    structuredClone(noticeTypeResolution),
  ]

  normalizeCrawledNoticeToCanonical({
    crawledNotice: source,
    previousCanonicalNotice: previous,
    campusResolution,
    noticeTypeResolution,
    context: createAdapterContext(),
  })

  assert.deepEqual(source, snapshots[0])
  assert.deepEqual(previous, snapshots[1])
  assert.deepEqual(campusResolution, snapshots[2])
  assert.deepEqual(noticeTypeResolution, snapshots[3])
})
