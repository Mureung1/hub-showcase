import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { normalizeKnuV044ToCrawledNotice } from '../normalizeKnuV044ToCrawledNotice.js'
import { createAdapterContext } from './fixtures.js'

const fixtureDirectory = new URL(
  '../../../../../test-corpus/fixtures/knu-crawler-v0.4.4/',
  import.meta.url,
)

function readJsonFixture(name) {
  return JSON.parse(readFileSync(new URL(name, fixtureDirectory), 'utf8'))
}

function createSourceNotice(boardId = '720') {
  return readJsonFixture(`normalized-notice-${boardId}.sample.json`)
}

function createBoardRegistry() {
  return readJsonFixture('knu-board-registry.v0.2.sample.json')
}

function normalize(normalizedNotice, overrides = {}) {
  return normalizeKnuV044ToCrawledNotice({
    normalizedNotice,
    boardRegistry: overrides.boardRegistry ?? createBoardRegistry(),
    context: overrides.context ?? createAdapterContext(),
  })
}

function assertRejected(mutator, options = {}) {
  const notice = options.notice ?? createSourceNotice()
  const registry = options.registry ?? createBoardRegistry()
  mutator(notice, registry)

  assert.throws(() =>
    normalizeKnuV044ToCrawledNotice({
      normalizedNotice: notice,
      boardRegistry: registry,
      context: options.context ?? createAdapterContext(),
    }),
  )
}

test('normalizes sanitized board 720 and 721 fixtures', () => {
  const academicSource = createSourceNotice('720')
  const academic = normalize(academicSource)
  const scholarship = normalize(createSourceNotice('721'))

  assert.equal(academic.schemaVersion, 1)
  assert.equal(academic.institutionId, 'kangwon')
  assert.equal(academic.sourceInstitutionKey, 'kangwon.ac.kr')
  assert.equal(academic.sourceBoard.boardId, '720')
  assert.equal(academic.sourceBoard.noticeTypeHint, 'school_notice')
  assert.equal(academic.sourceIdentityKey, 'kangwon:school_notice:900001')
  assert.equal(academic.fetchedAt, academicSource.crawler.crawledAt)
  assert.deepEqual(academic.listedCampusClassification, {
    rawLabel: '삼척',
    campuses: ['samcheok'],
    scope: 'specific',
  })
  assert.equal(academic.attachments.length, 4)
  assert.ok(
    academic.attachments.every(
      (attachment) => attachment.extractionStatus === 'not_requested',
    ),
  )

  assert.equal(scholarship.sourceBoard.boardId, '721')
  assert.equal(scholarship.sourceBoard.noticeTypeHint, 'scholarship')
  assert.deepEqual(scholarship.listedCampusClassification.campuses, [
    'gangneung_wonju',
  ])
})

test('normalizes exact v0.3 and v0.4 literals identically', () => {
  const versionFour = createSourceNotice()
  const versionThree = structuredClone(versionFour)
  versionThree.schemaVersion = 'noticepilot.normalizedNotice.v0.3'

  assert.deepEqual(normalize(versionThree), normalize(versionFour))

  for (const schemaVersion of [
    'v0.3',
    'v0.4',
    'noticepilot.normalizedNotice.v0.4.1',
  ]) {
    assertRejected((notice) => {
      notice.schemaVersion = schemaVersion
    })
  }
})

test('resolves an observed alias board to its canonical board and identity', () => {
  const notice = createSourceNotice()
  notice.board.boardId = '718'
  notice.listMetadata.board_id = '718'
  notice.sourceUrl = notice.sourceUrl.replace('/bbs/720/', '/bbs/718/')
  notice.listMetadata.url = notice.sourceUrl

  const result = normalize(notice)

  assert.equal(result.sourceUrl, notice.sourceUrl)
  assert.equal(result.sourceBoard.boardId, '720')
  assert.equal(result.sourceBoard.boardKey, 'knu-bbs-720')
  assert.equal(result.sourceIdentityKey, 'kangwon:school_notice:900001')
  assert.equal(
    result.canonicalSourceUrl,
    'https://www.kangwon.ac.kr/ko/bbs/720/detail.do?pstSn=900001',
  )

  assertRejected((_source, registry) => {
    registry.push({
      ...structuredClone(registry[0]),
      boardId: '999',
      aliasBoardIds: ['720'],
    })
  })
})

test('rejects inconsistent board, post, URL, title, and date fields', () => {
  const mutators = [
    (notice) => {
      notice.listMetadata.board_id = '999'
    },
    (notice) => {
      notice.listMetadata.pst_sn = 'different'
    },
    (notice) => {
      notice.listMetadata.title = `${notice.title} changed`
    },
    (notice) => {
      notice.listMetadata.title = ` ${notice.title}`
    },
    (notice) => {
      notice.listMetadata.published_at = '2026-07-03'
    },
    (notice) => {
      notice.sourceUrl = notice.sourceUrl.replace(
        'www.kangwon.ac.kr',
        'example.com',
      )
      notice.listMetadata.url = notice.sourceUrl
    },
    (notice) => {
      notice.sourceUrl = notice.sourceUrl.replace('/bbs/720/', '/bbs/721/')
      notice.listMetadata.url = notice.sourceUrl
    },
    (notice) => {
      notice.sourceUrl = `${notice.sourceUrl}&pstSn=${notice.pstSn}`
      notice.listMetadata.url = notice.sourceUrl
    },
    (notice) => {
      notice.sourceUrl = notice.sourceUrl.replace(
        '/detail.do',
        '/list.do',
      )
      notice.listMetadata.url = notice.sourceUrl
    },
  ]

  for (const mutator of mutators) assertRejected(mutator)
})

test('derives listed campus only from listMetadata.campus', () => {
  const allNotice = createSourceNotice()
  allNotice.listMetadata.campus = 'ALL'
  allNotice.campusScope = {
    sourceLabel: 'ALL',
    campuses: ['all'],
    scopeType: 'all_campuses',
    confidence: 'high',
    source: 'listMetadata.campus',
    labels: { all: '전체' },
  }
  assert.deepEqual(normalize(allNotice).listedCampusClassification.campuses, [
    'chuncheon',
    'samcheok',
    'dogye',
    'gangneung_wonju',
  ])

  const unknownNotice = createSourceNotice()
  unknownNotice.listMetadata.campus = ''
  unknownNotice.campusScope = {
    sourceLabel: null,
    campuses: ['unknown'],
    scopeType: 'unknown',
    confidence: 'low',
    source: 'none',
    labels: { unknown: '불명확' },
  }
  assert.deepEqual(normalize(unknownNotice).listedCampusClassification, {
    rawLabel: null,
    campuses: [],
    scope: 'unknown',
  })

  const nonListHint = createSourceNotice()
  nonListHint.campusScope = {
    sourceLabel: 'title_or_body',
    campuses: ['gangneung_wonju'],
    scopeType: 'campus_specific',
    confidence: 'high',
    source: 'title_or_body',
    labels: { gangneung_wonju: '강릉원주' },
  }
  assert.deepEqual(normalize(nonListHint).listedCampusClassification.campuses, [
    'samcheok',
  ])

  assertRejected((notice) => {
    notice.campusScope.campuses = ['gangneung_wonju']
    notice.campusScope.labels = { gangneung_wonju: '강릉원주' }
  })
})

test('enforces extracted and empty source content states', () => {
  const emptyNotice = createSourceNotice()
  emptyNotice.extractedText = ''
  emptyNotice.extractedTextChars = 0
  emptyNotice.textExtractionStatus = 'empty_body'

  const result = normalize(emptyNotice)
  assert.equal(result.contentExtractionStatus, 'empty')
  assert.equal(result.contentText, '')

  assertRejected((notice) => {
    notice.extractedTextChars += 1
  })
  assertRejected((notice) => {
    notice.extractedText = ''
    notice.extractedTextChars = 0
  })
  assertRejected((notice) => {
    notice.textExtractionStatus = 'failed'
  })
})

test('maps downloaded and failed attachments without leaking source diagnostics', () => {
  const downloadedNotice = createSourceNotice()
  Object.assign(downloadedNotice.attachments[0], {
    downloaded: true,
    status: 'downloaded',
    size_bytes: 128,
    sha256: 'c'.repeat(64),
    local_path: '/private/source/downloaded-file.hwp',
  })
  const downloaded = normalize(downloadedNotice).attachments[0]
  assert.equal(downloaded.extractionStatus, 'downloaded')
  assert.equal(downloaded.sizeBytes, 128)
  assert.equal(downloaded.contentHash, 'c'.repeat(64))
  assert.equal(downloaded.fetchedAt, downloadedNotice.crawler.crawledAt)
  assert.equal('local_path' in downloaded, false)

  const failureCases = [
    ['failed_invalid_content', 'source_invalid_content'],
    ['failed_exception', 'source_download_exception'],
  ]

  for (const [status, errorCode] of failureCases) {
    const failedNotice = createSourceNotice()
    Object.assign(failedNotice.attachments[0], {
      status,
      error: 'STACK_MARKER source exception details',
      local_path: '/private/source/failed-file.tmp',
    })
    const failed = normalize(failedNotice).attachments[0]
    const serialized = JSON.stringify(failed)

    assert.equal(failed.extractionStatus, 'failed')
    assert.equal(failed.errorCode, errorCode)
    assert.equal(serialized.includes('STACK_MARKER'), false)
    assert.equal(serialized.includes('/private/source'), false)
  }
})

test('rejects inconsistent attachment counts, indexes, URLs, and statuses', () => {
  const mutators = [
    (notice) => {
      notice.attachmentCount += 1
    },
    (notice) => {
      notice.attachments[1].index = 1
    },
    (notice) => {
      notice.attachments[0].download_url =
        'https://example.com/ko/cmmn/download.do?dn=a&path=/b&fn=c.pdf'
    },
    (notice) => {
      notice.attachments[0].download_url =
        `${notice.attachments[0].download_url}&dn=duplicate`
    },
    (notice) => {
      notice.attachments[0].downloaded = true
    },
    (notice) => {
      notice.attachments[0].status = 'downloaded'
      notice.attachments[0].downloaded = true
    },
    (notice) => {
      notice.attachments[0].status = 'failed_exception'
    },
    (notice) => {
      notice.attachments[0].status = 'unsupported'
    },
    (notice) => {
      notice.attachments[0].sha256 = 'not-a-sha256'
    },
  ]

  for (const mutator of mutators) assertRejected(mutator)
})

test('rejects duplicate generated attachment IDs through core validation', () => {
  assertRejected(
    () => {},
    {
      context: createAdapterContext({ idFactory: () => 'duplicate-id' }),
    },
  )
})

test('does not mutate source notice or registry inputs', () => {
  const notice = createSourceNotice()
  const registry = createBoardRegistry()
  const originalNotice = structuredClone(notice)
  const originalRegistry = structuredClone(registry)

  normalizeKnuV044ToCrawledNotice({
    normalizedNotice: notice,
    boardRegistry: registry,
    context: createAdapterContext(),
  })

  assert.deepEqual(notice, originalNotice)
  assert.deepEqual(registry, originalRegistry)
})
