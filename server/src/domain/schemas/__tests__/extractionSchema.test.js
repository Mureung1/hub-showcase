import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CalendarEventCandidateSchema,
  EvidenceRefSchema,
  ExtractionItemSchema,
  ExtractionResultSchema,
} from '../extractionSchema.js'
import {
  createCalendarEventCandidate,
  createEvidenceRef,
  createExtractionItem,
  createExtractionResult,
} from './fixtures.js'

test('EvidenceRefSchema enforces body and attachment ownership', () => {
  assert.equal(EvidenceRefSchema.safeParse(createEvidenceRef()).success, true)
  assert.equal(
    EvidenceRefSchema.safeParse(
      createEvidenceRef({ attachmentId: 'attachment-1' }),
    ).success,
    false,
  )
  assert.equal(
    EvidenceRefSchema.safeParse(
      createEvidenceRef({
        sourcePart: 'attachment',
        attachmentId: 'attachment-1',
      }),
    ).success,
    true,
  )
  assert.equal(
    EvidenceRefSchema.safeParse(
      createEvidenceRef({ sourcePart: 'attachment', attachmentId: null }),
    ).success,
    false,
  )
})

test('EvidenceRefSchema enforces offset pairing, ordering, and exact match', () => {
  assert.equal(
    EvidenceRefSchema.safeParse(createEvidenceRef({ endOffset: null })).success,
    false,
  )
  assert.equal(
    EvidenceRefSchema.safeParse(
      createEvidenceRef({ startOffset: 10, endOffset: 5 }),
    ).success,
    false,
  )
  assert.equal(
    EvidenceRefSchema.safeParse(createEvidenceRef({ exactMatch: false })).success,
    false,
  )
  assert.equal(
    EvidenceRefSchema.safeParse(
      createEvidenceRef({ startOffset: null, endOffset: null, exactMatch: true }),
    ).success,
    true,
  )
})

test('empty exactText is accepted only for non-exact evidence', () => {
  assert.equal(
    EvidenceRefSchema.safeParse(
      createEvidenceRef({
        exactText: '',
        exactMatch: false,
        startOffset: null,
        endOffset: null,
      }),
    ).success,
    true,
  )
  assert.equal(
    EvidenceRefSchema.safeParse(
      createEvidenceRef({
        exactText: '',
        exactMatch: true,
        startOffset: null,
        endOffset: null,
      }),
    ).success,
    false,
  )
})

test('ExtractionItemSchema requires a date when normalizedTime exists', () => {
  assert.equal(
    ExtractionItemSchema.safeParse(
      createExtractionItem({ normalizedDate: null, normalizedTime: '10:00' }),
    ).success,
    false,
  )
})

test('review state and review reason uniqueness are enforced', () => {
  assert.equal(
    ExtractionItemSchema.safeParse(
      createExtractionItem({ reviewRequired: true, reviewReasons: [] }),
    ).success,
    false,
  )
  assert.equal(
    ExtractionItemSchema.safeParse(
      createExtractionItem({
        reviewRequired: false,
        reviewReasons: ['low_confidence'],
      }),
    ).success,
    false,
  )
  assert.equal(
    ExtractionItemSchema.safeParse(
      createExtractionItem({
        reviewRequired: true,
        reviewReasons: ['low_confidence', 'low_confidence'],
      }),
    ).success,
    false,
  )
})

test('CalendarEventCandidateSchema enforces all-day and timed states', () => {
  assert.equal(
    CalendarEventCandidateSchema.safeParse(createCalendarEventCandidate()).success,
    true,
  )
  assert.equal(
    CalendarEventCandidateSchema.safeParse(
      createCalendarEventCandidate({ normalizedTime: '10:00' }),
    ).success,
    false,
  )
  assert.equal(
    CalendarEventCandidateSchema.safeParse(
      createCalendarEventCandidate({ timezone: 'Asia/Seoul' }),
    ).success,
    false,
  )

  const timedCandidate = createCalendarEventCandidate({
    isAllDay: false,
    normalizedTime: '10:00',
    timezone: 'Asia/Seoul',
  })
  assert.equal(CalendarEventCandidateSchema.safeParse(timedCandidate).success, true)

  for (const fieldName of ['normalizedDate', 'normalizedTime', 'timezone']) {
    assert.equal(
      CalendarEventCandidateSchema.safeParse({
        ...timedCandidate,
        [fieldName]: null,
      }).success,
      false,
      fieldName,
    )
  }

  assert.equal(
    CalendarEventCandidateSchema.safeParse(
      createCalendarEventCandidate({
        normalizedDate: null,
        isAllDay: null,
      }),
    ).success,
    true,
  )
})

test('candidate suppressionReason follows candidate status', () => {
  assert.equal(
    CalendarEventCandidateSchema.safeParse(
      createCalendarEventCandidate({ candidateStatus: 'suppressed' }),
    ).success,
    false,
  )
  assert.equal(
    CalendarEventCandidateSchema.safeParse(
      createCalendarEventCandidate({
        candidateStatus: 'suppressed',
        suppressionReason: 'duplicate',
      }),
    ).success,
    true,
  )
  assert.equal(
    CalendarEventCandidateSchema.safeParse(
      createCalendarEventCandidate({ suppressionReason: 'unexpected' }),
    ).success,
    false,
  )
})

test('ExtractionResultSchema validates child IDs and uniqueness', () => {
  assert.equal(ExtractionResultSchema.safeParse(createExtractionResult()).success, true)

  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        items: [createExtractionItem({ extractionId: 'other-extraction' })],
      }),
    ).success,
    false,
  )
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        items: [createExtractionItem({ sourceNoticeId: 'other-notice' })],
      }),
    ).success,
    false,
  )
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        calendarEventCandidates: [
          createCalendarEventCandidate({ extractionId: 'other-extraction' }),
        ],
      }),
    ).success,
    false,
  )
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        items: [createExtractionItem(), createExtractionItem()],
      }),
    ).success,
    false,
  )
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        calendarEventCandidates: [
          createCalendarEventCandidate(),
          createCalendarEventCandidate(),
        ],
      }),
    ).success,
    false,
  )
})

test('ExtractionResultSchema validates related item and warning references', () => {
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        calendarEventCandidates: [
          createCalendarEventCandidate({ relatedItemId: 'missing-item' }),
        ],
      }),
    ).success,
    false,
  )
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        warnings: [
          {
            type: 'reference_warning',
            message: 'Missing item',
            itemId: 'missing-item',
            candidateId: null,
          },
        ],
      }),
    ).success,
    false,
  )
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        warnings: [
          {
            type: 'reference_warning',
            message: 'Missing candidate',
            itemId: null,
            candidateId: 'missing-candidate',
          },
        ],
      }),
    ).success,
    false,
  )
})

test('failed extraction results require empty item and candidate collections', () => {
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({
        items: [],
        calendarEventCandidates: [],
        status: 'failed',
      }),
    ).success,
    true,
  )
  assert.equal(
    ExtractionResultSchema.safeParse(
      createExtractionResult({ status: 'failed' }),
    ).success,
    false,
  )
})
