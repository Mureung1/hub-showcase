import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CanonicalCampusMetadataSchema,
  CanonicalNoticeSchema,
} from '../canonicalNoticeSchema.js'
import {
  ALL_CAMPUSES,
  createCanonicalCampusMetadata,
  createCanonicalNotice,
  createSourceBoard,
} from './fixtures.js'

test('CanonicalNoticeSchema accepts valid crawler and manual notices', () => {
  assert.equal(CanonicalNoticeSchema.safeParse(createCanonicalNotice()).success, true)
  assert.equal(
    CanonicalNoticeSchema.safeParse(
      createCanonicalNotice({
        sourceKind: 'manual',
        institutionId: null,
        sourceBoard: null,
        sourcePostId: null,
        sourceUrl: null,
        canonicalSourceUrl: null,
      }),
    ).success,
    true,
  )
})

test('crawler notices require every source identity field', () => {
  for (const fieldName of [
    'institutionId',
    'sourceBoard',
    'sourcePostId',
    'sourceUrl',
    'canonicalSourceUrl',
  ]) {
    assert.equal(
      CanonicalNoticeSchema.safeParse(
        createCanonicalNotice({ [fieldName]: null }),
      ).success,
      false,
      fieldName,
    )
  }
})

test('sourceBoard institution must match the canonical notice institution', () => {
  assert.equal(
    CanonicalNoticeSchema.safeParse(
      createCanonicalNotice({
        sourceBoard: createSourceBoard({ institutionId: 'other-institution' }),
      }),
    ).success,
    false,
  )
})

test('target and excluded campus arrays must not overlap', () => {
  assert.equal(
    CanonicalCampusMetadataSchema.safeParse(
      createCanonicalCampusMetadata({ excludedCampuses: ['chuncheon'] }),
    ).success,
    false,
  )
})

test('canonical all and unknown target scopes enforce their invariants', () => {
  assert.equal(
    CanonicalCampusMetadataSchema.safeParse(
      createCanonicalCampusMetadata({ targetCampuses: ALL_CAMPUSES.slice(0, 3) }),
    ).success,
    false,
  )
  assert.equal(
    CanonicalCampusMetadataSchema.safeParse(
      createCanonicalCampusMetadata({
        targetScope: 'unknown',
        targetCampuses: ['chuncheon'],
        targetCampusBasis: 'unknown',
      }),
    ).success,
    false,
  )
})

test('campus review state is enforced in both directions', () => {
  assert.equal(
    CanonicalCampusMetadataSchema.safeParse(
      createCanonicalCampusMetadata({ campusReviewRequired: true }),
    ).success,
    false,
  )
  assert.equal(
    CanonicalCampusMetadataSchema.safeParse(
      createCanonicalCampusMetadata({
        campusReviewRequired: false,
        campusReviewReasons: ['source_target_campus_conflict'],
      }),
    ).success,
    false,
  )
})

test('superseded notices require a non-self link and other statuses reject it', () => {
  assert.equal(
    CanonicalNoticeSchema.safeParse(
      createCanonicalNotice({
        status: 'superseded',
        supersededByNoticeId: 'notice-2',
      }),
    ).success,
    true,
  )
  assert.equal(
    CanonicalNoticeSchema.safeParse(
      createCanonicalNotice({ status: 'superseded' }),
    ).success,
    false,
  )
  assert.equal(
    CanonicalNoticeSchema.safeParse(
      createCanonicalNotice({ supersededByNoticeId: 'notice-2' }),
    ).success,
    false,
  )
  assert.equal(
    CanonicalNoticeSchema.safeParse(
      createCanonicalNotice({
        status: 'superseded',
        supersededByNoticeId: 'notice-1',
      }),
    ).success,
    false,
  )
})

test('unknown notice type basis requires unknown notice type', () => {
  assert.equal(
    CanonicalNoticeSchema.safeParse(
      createCanonicalNotice({ noticeTypeBasis: 'unknown' }),
    ).success,
    false,
  )
  assert.equal(
    CanonicalNoticeSchema.safeParse(
      createCanonicalNotice({
        noticeTypeBasis: 'unknown',
        noticeType: 'unknown',
      }),
    ).success,
    true,
  )
})

test('revision zero fails', () => {
  assert.equal(
    CanonicalNoticeSchema.safeParse(createCanonicalNotice({ revision: 0 })).success,
    false,
  )
})
