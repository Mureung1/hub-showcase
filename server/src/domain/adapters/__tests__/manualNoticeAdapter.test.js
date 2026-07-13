import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AdapterContextSchema,
  normalizeManualNoticeToCanonical,
} from '../index.js'
import { ManualNoticeInputSchema } from '../../schemas/manualNoticeInputSchema.js'
import {
  createAdapterContext,
  createCanonicalCampusMetadata,
  createCanonicalNotice,
  createManualNoticeInput,
} from './fixtures.js'

test('ManualNoticeInputSchema is strict and requires explicit nullable fields', () => {
  const validInput = createManualNoticeInput()

  assert.equal(ManualNoticeInputSchema.safeParse(validInput).success, true)
  assert.equal(
    ManualNoticeInputSchema.safeParse({ ...validInput, extra: true }).success,
    false,
  )

  const { publishedAt, ...missingPublishedAt } = validInput
  assert.equal(publishedAt, '2026-07-10')
  assert.equal(ManualNoticeInputSchema.safeParse(missingPublishedAt).success, false)
  assert.equal(
    ManualNoticeInputSchema.safeParse({ ...validInput, publishedAt: undefined })
      .success,
    false,
  )
})

test('first manual notice creation injects ID, hashes, timestamps, and revision', () => {
  let idCalls = 0
  let hashCalls = 0
  const input = createManualNoticeInput({ normalizedText: '  preserved body  ' })
  const context = createAdapterContext({
    idFactory: (entityType) => {
      idCalls += 1
      assert.equal(entityType, 'canonical_notice')
      return 'manual-notice-1'
    },
    hashText: (text) => {
      hashCalls += 1
      assert.equal(text, '  preserved body  ')
      return 'manual-body-hash'
    },
  })

  const notice = normalizeManualNoticeToCanonical({
    manualNoticeInput: input,
    previousCanonicalNotice: null,
    context,
  })

  assert.equal(idCalls, 1)
  assert.equal(hashCalls, 1)
  assert.equal(notice.noticeId, 'manual-notice-1')
  assert.equal(notice.normalizedText, '  preserved body  ')
  assert.equal(notice.contentHash, 'manual-body-hash')
  assert.equal(notice.semanticContentHash, 'manual-body-hash')
  assert.equal(notice.revision, 1)
  assert.equal(notice.createdAt, context.now)
  assert.equal(notice.updatedAt, context.now)
})

test('manual notice type basis distinguishes known and unknown types', () => {
  const known = normalizeManualNoticeToCanonical({
    manualNoticeInput: createManualNoticeInput(),
    previousCanonicalNotice: null,
    context: createAdapterContext(),
  })
  const unknown = normalizeManualNoticeToCanonical({
    manualNoticeInput: createManualNoticeInput({ noticeType: 'unknown' }),
    previousCanonicalNotice: null,
    context: createAdapterContext(),
  })

  assert.equal(known.noticeTypeBasis, 'manual')
  assert.equal(unknown.noticeTypeBasis, 'unknown')
})

test('null campus creates the exact unresolved review state', () => {
  const notice = normalizeManualNoticeToCanonical({
    manualNoticeInput: createManualNoticeInput({ campus: null }),
    previousCanonicalNotice: null,
    context: createAdapterContext(),
  })

  assert.deepEqual(notice.campus, {
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
  })
})

test('an explicit valid campus object is preserved', () => {
  const campus = createCanonicalCampusMetadata()
  const notice = normalizeManualNoticeToCanonical({
    manualNoticeInput: createManualNoticeInput({ campus }),
    previousCanonicalNotice: null,
    context: createAdapterContext(),
  })

  assert.deepEqual(notice.campus, campus)
})

test('revision changes only when normalized text hash changes', () => {
  const first = normalizeManualNoticeToCanonical({
    manualNoticeInput: createManualNoticeInput(),
    previousCanonicalNotice: null,
    context: createAdapterContext(),
  })

  let updateIdCalls = 0
  const unchanged = normalizeManualNoticeToCanonical({
    manualNoticeInput: createManualNoticeInput({ title: 'Metadata-only rename' }),
    previousCanonicalNotice: first,
    context: createAdapterContext({
      now: '2026-07-10T11:00:00+09:00',
      idFactory: () => {
        updateIdCalls += 1
        return 'must-not-be-used'
      },
    }),
  })
  const changed = normalizeManualNoticeToCanonical({
    manualNoticeInput: createManualNoticeInput({ normalizedText: 'Changed body' }),
    previousCanonicalNotice: unchanged,
    context: createAdapterContext({ now: '2026-07-10T12:00:00+09:00' }),
  })

  assert.equal(updateIdCalls, 0)
  assert.equal(unchanged.noticeId, first.noticeId)
  assert.equal(unchanged.createdAt, first.createdAt)
  assert.equal(unchanged.updatedAt, '2026-07-10T11:00:00+09:00')
  assert.equal(unchanged.revision, 1)
  assert.equal(changed.noticeId, first.noticeId)
  assert.equal(changed.revision, 2)
})

test('only an active previous manual notice may be updated', () => {
  const manual = normalizeManualNoticeToCanonical({
    manualNoticeInput: createManualNoticeInput(),
    previousCanonicalNotice: null,
    context: createAdapterContext(),
  })

  for (const previousCanonicalNotice of [
    createCanonicalNotice(),
    { ...manual, status: 'deleted' },
    {
      ...manual,
      status: 'superseded',
      supersededByNoticeId: 'manual-notice-2',
    },
  ]) {
    assert.throws(() =>
      normalizeManualNoticeToCanonical({
        manualNoticeInput: createManualNoticeInput(),
        previousCanonicalNotice,
        context: createAdapterContext(),
      }),
    )
  }
})

test('adapter context and injected ID/hash outputs are validated', () => {
  assert.equal(AdapterContextSchema.safeParse(createAdapterContext()).success, true)
  assert.equal(
    AdapterContextSchema.safeParse(
      createAdapterContext({ idFactory: 'not-a-function' }),
    ).success,
    false,
  )

  for (const context of [
    createAdapterContext({ now: '2026-07-10T10:00:00' }),
    createAdapterContext({ idFactory: () => '   ' }),
    createAdapterContext({ hashText: () => '   ' }),
  ]) {
    assert.throws(() =>
      normalizeManualNoticeToCanonical({
        manualNoticeInput: createManualNoticeInput(),
        previousCanonicalNotice: null,
        context,
      }),
    )
  }
})
