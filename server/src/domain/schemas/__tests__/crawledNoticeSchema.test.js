import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AttachmentRefSchema,
  CrawledNoticeSchema,
  ListedCampusClassificationSchema,
} from '../crawledNoticeSchema.js'
import { SourceBoardSchema } from '../sourceBoardSchema.js'
import {
  ALL_CAMPUSES,
  createAttachmentRef,
  createCrawledNotice,
  createListedCampusClassification,
  createSourceBoard,
} from './fixtures.js'

test('CrawledNoticeSchema accepts a valid crawled notice', () => {
  assert.equal(CrawledNoticeSchema.safeParse(createCrawledNotice()).success, true)
})

test('listed campus all, specific, and unknown scopes enforce their invariants', () => {
  assert.equal(
    ListedCampusClassificationSchema.safeParse(
      createListedCampusClassification(),
    ).success,
    true,
  )
  assert.equal(
    ListedCampusClassificationSchema.safeParse(
      createListedCampusClassification({
        rawLabel: '춘천',
        campuses: ['chuncheon'],
        scope: 'specific',
      }),
    ).success,
    true,
  )
  assert.equal(
    ListedCampusClassificationSchema.safeParse(
      createListedCampusClassification({
        rawLabel: null,
        campuses: [],
        scope: 'unknown',
      }),
    ).success,
    true,
  )
  assert.equal(
    ListedCampusClassificationSchema.safeParse(
      createListedCampusClassification({ campuses: ALL_CAMPUSES.slice(0, 3) }),
    ).success,
    false,
  )
  assert.equal(
    ListedCampusClassificationSchema.safeParse(
      createListedCampusClassification({ campuses: [], scope: 'specific' }),
    ).success,
    false,
  )
  assert.equal(
    ListedCampusClassificationSchema.safeParse(
      createListedCampusClassification({
        campuses: ['chuncheon'],
        scope: 'unknown',
      }),
    ).success,
    false,
  )
})

test('primitive campus and alias arrays reject duplicates', () => {
  assert.equal(
    ListedCampusClassificationSchema.safeParse(
      createListedCampusClassification({
        campuses: ['chuncheon', 'chuncheon'],
        scope: 'specific',
      }),
    ).success,
    false,
  )
  assert.equal(
    SourceBoardSchema.safeParse(
      createSourceBoard({ aliasBoardIds: ['old-board', 'old-board'] }),
    ).success,
    false,
  )
})

test('SourceBoardSchema rejects a self alias', () => {
  assert.equal(
    SourceBoardSchema.safeParse(
      createSourceBoard({ aliasBoardIds: ['board-1'] }),
    ).success,
    false,
  )
})

test('CrawledNoticeSchema enforces extracted and empty content states', () => {
  assert.equal(
    CrawledNoticeSchema.safeParse(
      createCrawledNotice({ contentText: '', contentExtractionStatus: 'extracted' }),
    ).success,
    false,
  )
  assert.equal(
    CrawledNoticeSchema.safeParse(
      createCrawledNotice({ contentText: '', contentExtractionStatus: 'empty' }),
    ).success,
    true,
  )
  assert.equal(
    CrawledNoticeSchema.safeParse(
      createCrawledNotice({
        contentText: 'unexpected',
        contentExtractionStatus: 'empty',
      }),
    ).success,
    false,
  )
  assert.equal(
    CrawledNoticeSchema.safeParse(
      createCrawledNotice({ contentText: '', contentExtractionStatus: 'failed' }),
    ).success,
    true,
  )
})

test('CrawledNoticeSchema rejects duplicate attachment IDs', () => {
  assert.equal(
    CrawledNoticeSchema.safeParse(
      createCrawledNotice({
        attachments: [
          createAttachmentRef(),
          createAttachmentRef({ fileName: 'second.pdf' }),
        ],
      }),
    ).success,
    false,
  )
})

test('AttachmentRefSchema enforces extraction and error-code states', () => {
  assert.equal(
    AttachmentRefSchema.safeParse(
      createAttachmentRef({
        extractionStatus: 'extracted',
        normalizedText: '',
      }),
    ).success,
    true,
  )
  assert.equal(
    AttachmentRefSchema.safeParse(
      createAttachmentRef({
        extractionStatus: 'extracted',
        normalizedText: null,
      }),
    ).success,
    false,
  )
  assert.equal(
    AttachmentRefSchema.safeParse(
      createAttachmentRef({ extractionStatus: 'failed', errorCode: null }),
    ).success,
    false,
  )
  assert.equal(
    AttachmentRefSchema.safeParse(
      createAttachmentRef({ extractionStatus: 'failed', errorCode: 'PARSE_ERROR' }),
    ).success,
    true,
  )
  assert.equal(
    AttachmentRefSchema.safeParse(
      createAttachmentRef({ extractionStatus: 'downloaded', errorCode: 'ERROR' }),
    ).success,
    false,
  )
})
