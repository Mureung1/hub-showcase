import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  normalizeCrawledNoticeToCanonical,
  normalizeKnuRuleCandidatesToExtractionResult,
  normalizeKnuV044ToCrawledNotice,
} from '../index.js'
import { createAdapterContext } from './fixtures.js'

const fixtureRoot = new URL(
  '../../../../../test-corpus/fixtures/',
  import.meta.url,
)

function readFixture(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, fixtureRoot), 'utf8'))
}

function createPipelineInput(boardId = '720') {
  const postId = boardId === '720' ? '900001' : '900002'
  const normalizedNotice = readFixture(
    `knu-crawler-v0.4.4/normalized-notice-${boardId}.sample.json`,
  )
  const boardRegistry = readFixture(
    'knu-crawler-v0.4.4/knu-board-registry.v0.2.sample.json',
  )
  const candidatePayload = readFixture(
    `knu-rule-candidates-v0.4/knu-${boardId}-${postId}.candidates.sample.json`,
  )
  const crawledNotice = normalizeKnuV044ToCrawledNotice({
    normalizedNotice,
    boardRegistry,
    context: createAdapterContext(),
  })
  const canonicalNotice = normalizeCrawledNoticeToCanonical({
    crawledNotice,
    previousCanonicalNotice: null,
    campusResolution: null,
    noticeTypeResolution: null,
    context: createAdapterContext(),
  })

  return { candidatePayload, canonicalNotice }
}

function normalize(candidatePayload, canonicalNotice, context) {
  return normalizeKnuRuleCandidatesToExtractionResult({
    candidatePayload,
    canonicalNotice,
    context: context ?? createAdapterContext(),
  })
}

test('maps actual S18 timed and all-day fixtures to ExtractionResult', () => {
  const board720 = createPipelineInput('720')
  const board721 = createPipelineInput('721')
  const idCalls = []
  let sequence = 0
  const context = createAdapterContext({
    now: '2026-07-10T22:00:00+09:00',
    idFactory: (entityType) => {
      idCalls.push(entityType)
      return `${entityType}-${++sequence}`
    },
  })

  const timedResult = normalize(
    board720.candidatePayload,
    board720.canonicalNotice,
    context,
  )
  const allDayResult = normalize(
    board721.candidatePayload,
    board721.canonicalNotice,
  )

  assert.deepEqual(idCalls, [
    'extraction',
    'calendar_event_candidate',
    'evidence',
    'calendar_event_candidate',
    'evidence',
  ])
  assert.equal(timedResult.extractionMethod, 'rule')
  assert.equal(timedResult.schemaContractVersion, 'noticepilot.domain.v1')
  assert.equal(timedResult.status, 'completed')
  assert.equal(timedResult.sourceNoticeId, board720.canonicalNotice.noticeId)
  assert.equal(
    timedResult.sourceContentHash,
    board720.canonicalNotice.contentHash,
  )
  assert.equal(timedResult.summary, '')
  assert.equal(timedResult.provider, null)
  assert.equal(timedResult.model, null)
  assert.equal(timedResult.promptVersion, null)
  assert.equal(timedResult.inferredTitle, null)
  assert.equal(timedResult.extractorVersion, '0.4.4')
  assert.equal(
    timedResult.detectedNoticeType,
    board720.canonicalNotice.noticeType,
  )
  assert.equal(timedResult.detectedLanguage, 'unknown')
  assert.deepEqual(timedResult.items, [])
  assert.equal(
    timedResult.createdAt,
    board720.candidatePayload.extractor.createdAt,
  )

  const [student, department] = timedResult.calendarEventCandidates
  assert.equal(student.eventType, 'deadline')
  assert.equal(student.eventSubtype, 'submission_deadline')
  assert.equal(student.normalizedDate, '2026-08-03')
  assert.equal(student.normalizedTime, '18:00')
  assert.equal(student.timezone, 'Asia/Seoul')
  assert.equal(student.isAllDay, false)
  assert.equal(student.timeExpression, student.dateExpression)
  assert.equal(student.description, '')
  assert.equal(student.relatedItemId, null)
  assert.equal(student.candidateStatus, 'pending')
  assert.equal(student.suppressionReason, null)
  assert.equal(student.sourceNoticeId, board720.canonicalNotice.noticeId)
  assert.equal(
    student.sourceCandidateKey,
    board720.candidatePayload.candidates[0].id,
  )
  assert.equal(student.createdAt, board720.candidatePayload.extractor.createdAt)
  assert.equal(student.updatedAt, board720.candidatePayload.extractor.createdAt)
  assert.equal(student.description.includes(student.evidence[0].exactText), false)
  assert.equal(student.reviewRequired, false)
  assert.deepEqual(student.reviewReasons, [])

  assert.equal(department.targetActor, 'department')
  assert.equal(department.candidateStatus, 'pending')
  assert.equal(department.reviewRequired, false)
  assert.deepEqual(department.reviewReasons, [])
  assert.deepEqual(timedResult.warnings, [])

  const allDay = allDayResult.calendarEventCandidates[0]
  assert.equal(allDay.eventSubtype, 'application_deadline')
  assert.equal(allDay.normalizedDate, '2026-07-15')
  assert.equal(allDay.normalizedTime, null)
  assert.equal(allDay.timezone, null)
  assert.equal(allDay.isAllDay, true)
  assert.equal(allDay.timeExpression, '')
})

test('uses first exact body evidence occurrence and preserves line index', () => {
  const { candidatePayload, canonicalNotice } = createPipelineInput('721')
  const evidence = candidatePayload.candidates[0].evidence
  canonicalNotice.normalizedText = `${evidence}\nprefix ${evidence}`

  const converted = normalize(candidatePayload, canonicalNotice)
    .calendarEventCandidates[0].evidence[0]

  assert.equal(converted.exactMatch, true)
  assert.equal(converted.startOffset, 0)
  assert.equal(converted.endOffset, evidence.length)
  assert.equal(converted.sourceLineIndex, 1)
  assert.equal(converted.sourcePart, 'body')
  assert.equal(converted.attachmentId, null)
})

test('distinguishes non-exact evidence from empty evidence', () => {
  const nonExactInput = createPipelineInput('721')
  nonExactInput.candidatePayload.candidates[0].evidence = 'not in canonical text'
  const nonExact = normalize(
    nonExactInput.candidatePayload,
    nonExactInput.canonicalNotice,
  ).calendarEventCandidates[0]

  assert.equal(nonExact.evidence[0].exactMatch, false)
  assert.equal(nonExact.evidence[0].startOffset, null)
  assert.equal(nonExact.evidence[0].endOffset, null)
  assert.deepEqual(nonExact.reviewReasons, ['evidence_not_exact'])

  const emptyInput = createPipelineInput('721')
  emptyInput.candidatePayload.candidates[0].evidence = ''
  emptyInput.candidatePayload.candidates[0].uncertaintyReasons = [
    'missing_evidence',
  ]
  const empty = normalize(
    emptyInput.candidatePayload,
    emptyInput.canonicalNotice,
  ).calendarEventCandidates[0]

  assert.deepEqual(empty.evidence, [])
  assert.deepEqual(empty.reviewReasons, ['missing_evidence'])
  assert.equal(empty.reviewReasons.includes('evidence_not_exact'), false)
})

test('maps known uncertainty in fixed review order and emits warnings', () => {
  const { candidatePayload, canonicalNotice } = createPipelineInput('721')
  const candidate = candidatePayload.candidates[0]
  candidate.normalizedStart = null
  candidate.isAllDay = null
  candidate.evidence = 'non-exact evidence'
  candidate.confidence = 'low'
  candidate.targetActor = 'unknown'
  candidate.uncertaintyReasons = [
    'missing_normalized_date',
    'unknown_actor',
    'weak_action_type',
    'uncertain_keyword:예정',
  ]

  const result = normalize(candidatePayload, canonicalNotice)
  const converted = result.calendarEventCandidates[0]

  assert.deepEqual(converted.reviewReasons, [
    'ambiguous_date',
    'evidence_not_exact',
    'low_confidence',
    'unknown_actor',
    'other',
  ])
  assert.equal(converted.reviewRequired, true)
  assert.deepEqual(
    result.warnings.map((warning) => ({
      type: warning.type,
      message: warning.message,
      itemId: warning.itemId,
      candidateId: warning.candidateId,
    })),
    [
      {
        type: 'knu_rule_uncertainty',
        message: 'weak_action_type',
        itemId: null,
        candidateId: converted.candidateId,
      },
      {
        type: 'knu_rule_uncertainty',
        message: 'uncertain_keyword:예정',
        itemId: null,
        candidateId: converted.candidateId,
      },
    ],
  )
})

test('requires internal_actor exactly for department candidates', () => {
  const studentInput = createPipelineInput('721')
  studentInput.candidatePayload.candidates[0].uncertaintyReasons = [
    'internal_actor',
  ]
  assert.throws(() =>
    normalize(studentInput.candidatePayload, studentInput.canonicalNotice),
  )

  const departmentInput = createPipelineInput('720')
  departmentInput.candidatePayload.candidates[1].uncertaintyReasons = []
  assert.throws(() =>
    normalize(
      departmentInput.candidatePayload,
      departmentInput.canonicalNotice,
    ),
  )
})

test('maps every supported event type and rejects unknown literals', () => {
  const mappings = [
    ['application_deadline', 'application_deadline'],
    ['submission_deadline', 'submission_deadline'],
    ['payment_deadline', 'payment_deadline'],
    ['deadline', 'general_deadline'],
  ]

  for (const [eventType, eventSubtype] of mappings) {
    const { candidatePayload, canonicalNotice } = createPipelineInput('721')
    candidatePayload.candidates[0].eventType = eventType
    const converted = normalize(candidatePayload, canonicalNotice)
      .calendarEventCandidates[0]
    assert.equal(converted.eventType, 'deadline')
    assert.equal(converted.eventSubtype, eventSubtype)
  }

  const invalidInput = createPipelineInput('721')
  invalidInput.candidatePayload.candidates[0].eventType = 'interview'
  assert.throws(() =>
    normalize(invalidInput.candidatePayload, invalidInput.canonicalNotice),
  )
})

test('enforces date-only, timed, unresolved, and end-date source states', () => {
  const unresolvedInput = createPipelineInput('721')
  unresolvedInput.candidatePayload.candidates[0].normalizedStart = null
  unresolvedInput.candidatePayload.candidates[0].isAllDay = null
  unresolvedInput.candidatePayload.candidates[0].uncertaintyReasons = [
    'missing_normalized_date',
  ]
  const unresolved = normalize(
    unresolvedInput.candidatePayload,
    unresolvedInput.canonicalNotice,
  ).calendarEventCandidates[0]
  assert.equal(unresolved.normalizedDate, null)
  assert.equal(unresolved.normalizedTime, null)
  assert.equal(unresolved.timezone, null)
  assert.equal(unresolved.isAllDay, null)
  assert.deepEqual(unresolved.reviewReasons, ['ambiguous_date'])

  const mutators = [
    (candidate) => {
      candidate.normalizedStart = '2026-02-30'
    },
    (candidate) => {
      candidate.normalizedStart = '2026-07-15T18:00:00+09:00'
    },
    (candidate) => {
      candidate.normalizedStart = '2026-07-15T18:00:00Z'
      candidate.isAllDay = false
    },
    (candidate) => {
      candidate.normalizedEnd = '2026-07-16'
    },
  ]

  for (const mutator of mutators) {
    const { candidatePayload, canonicalNotice } = createPipelineInput('721')
    mutator(candidatePayload.candidates[0])
    assert.throws(() => normalize(candidatePayload, canonicalNotice))
  }
})

test('accepts only active KNU crawler canonical notices', () => {
  const variants = [
    (notice) => {
      notice.sourceKind = 'manual'
    },
    (notice) => {
      notice.status = 'deleted'
    },
    (notice) => {
      notice.status = 'superseded'
      notice.supersededByNoticeId = 'replacement-notice'
    },
    (notice) => {
      notice.institutionId = 'other'
      notice.sourceBoard.institutionId = 'other'
    },
    (notice) => {
      notice.sourceBoard.boardKey = 'not-a-knu-board'
    },
  ]

  for (const mutateCanonical of variants) {
    const { candidatePayload, canonicalNotice } = createPipelineInput('721')
    mutateCanonical(canonicalNotice)
    assert.throws(() => normalize(candidatePayload, canonicalNotice))
  }
})

test('validates payload identity, hash, title, URL, and notice type', () => {
  const mutators = [
    (payload) => {
      payload.sourceNoticeId = 'knu-721-different'
      payload.candidates[0].sourceNoticeId = payload.sourceNoticeId
    },
    (payload) => {
      payload.sourceContentHash = 'stale-hash'
    },
    (payload) => {
      payload.sourceTitle = 'different title'
      payload.candidates[0].sourceTitle = payload.sourceTitle
    },
    (payload) => {
      payload.sourceUrl = 'https://www.kangwon.ac.kr/other'
      payload.candidates[0].sourceUrl = payload.sourceUrl
    },
    (payload) => {
      payload.candidates[0].noticeType = 'school_notice'
    },
  ]

  for (const mutatePayload of mutators) {
    const { candidatePayload, canonicalNotice } = createPipelineInput('721')
    mutatePayload(candidatePayload)
    assert.throws(() => normalize(candidatePayload, canonicalNotice))
  }
})

test('compares source campus only with canonical listed classification', () => {
  const targetDifference = createPipelineInput('720')
  Object.assign(targetDifference.canonicalNotice.campus, {
    targetScope: 'specific',
    targetCampuses: ['dogye'],
    excludedCampuses: [],
    targetCampusBasis: 'explicit_text',
    campusReviewRequired: true,
    campusReviewReasons: ['source_target_campus_conflict'],
  })
  assert.doesNotThrow(() =>
    normalize(
      targetDifference.candidatePayload,
      targetDifference.canonicalNotice,
    ),
  )

  const payloadMismatch = createPipelineInput('720')
  payloadMismatch.candidatePayload.sourceCampusScope.campuses = ['dogye']
  payloadMismatch.candidatePayload.sourceCampusScope.labels = { dogye: '도계' }
  payloadMismatch.candidatePayload.candidates.forEach((candidate) => {
    candidate.campusScope = structuredClone(
      payloadMismatch.candidatePayload.sourceCampusScope,
    )
  })
  assert.throws(() =>
    normalize(
      payloadMismatch.candidatePayload,
      payloadMismatch.canonicalNotice,
    ),
  )

  const candidateMismatch = createPipelineInput('720')
  candidateMismatch.candidatePayload.candidates[0].campusScope.sourceLabel =
    'different'
  assert.throws(() =>
    normalize(
      candidateMismatch.candidatePayload,
      candidateMismatch.canonicalNotice,
    ),
  )

  const labelOrderOnly = createPipelineInput('720')
  labelOrderOnly.candidatePayload.sourceCampusScope = {
    sourceLabel: '삼척 도계',
    campuses: ['samcheok', 'dogye'],
    scopeType: 'campus_specific',
    confidence: 'medium',
    source: 'listMetadata.campus',
    labels: { samcheok: '삼척', dogye: '도계' },
  }
  labelOrderOnly.candidatePayload.candidates.forEach((candidate) => {
    candidate.campusScope = {
      ...structuredClone(labelOrderOnly.candidatePayload.sourceCampusScope),
      labels: { dogye: '도계', samcheok: '삼척' },
    }
  })
  labelOrderOnly.canonicalNotice.campus.listedCampusClassification = {
    rawLabel: '삼척 도계',
    campuses: ['samcheok', 'dogye'],
    scope: 'specific',
  }
  assert.doesNotThrow(() =>
    normalize(
      labelOrderOnly.candidatePayload,
      labelOrderOnly.canonicalNotice,
    ),
  )
})

test('validates source schema, UID hints, candidate IDs, and summary counts', () => {
  const mutators = [
    (payload) => {
      payload.schemaVersion = 'v0.4'
    },
    (payload) => {
      payload.extractor.version = '0.4.5'
    },
    (payload) => {
      payload.extractor.mode = 'other'
    },
    (payload) => {
      payload.extractor.createdAt = '2026-07-09T03:24:57'
    },
    (payload) => {
      payload.timezone = 'UTC'
    },
    (payload) => {
      payload.candidates[0].status = 'candidate'
    },
    (payload) => {
      payload.candidates[0].createdBy = 'ai'
    },
    (payload) => {
      payload.candidates[0].uidHint = 'invalid@noticepilot.local'
    },
    (payload) => {
      payload.summary.candidateCount += 1
    },
    (payload) => {
      payload.candidates[0].extra = true
    },
    (payload) => {
      payload.candidates[0].uncertaintyReasons = ['unregistered_reason']
    },
  ]

  for (const mutatePayload of mutators) {
    const { candidatePayload, canonicalNotice } = createPipelineInput('721')
    mutatePayload(candidatePayload)
    assert.throws(() => normalize(candidatePayload, canonicalNotice))
  }

  const duplicateInput = createPipelineInput('720')
  duplicateInput.candidatePayload.candidates[1].id =
    duplicateInput.candidatePayload.candidates[0].id
  duplicateInput.candidatePayload.candidates[1].uidHint =
    duplicateInput.candidatePayload.candidates[0].uidHint
  assert.throws(() =>
    normalize(duplicateInput.candidatePayload, duplicateInput.canonicalNotice),
  )
})

test('uses source timestamp and canonical notice type snapshots', () => {
  const { candidatePayload, canonicalNotice } = createPipelineInput('721')
  canonicalNotice.noticeType = 'competition'
  canonicalNotice.noticeTypeBasis = 'rule'
  canonicalNotice.noticeTypeConflict = true
  const context = createAdapterContext({
    now: '2030-01-01T00:00:00+09:00',
  })
  const result = normalize(candidatePayload, canonicalNotice, context)

  assert.equal(result.detectedNoticeType, 'competition')
  assert.equal(result.createdAt, candidatePayload.extractor.createdAt)
  assert.ok(
    result.calendarEventCandidates.every(
      (candidate) =>
        candidate.createdAt === candidatePayload.extractor.createdAt &&
        candidate.updatedAt === candidatePayload.extractor.createdAt,
    ),
  )
  assert.notEqual(result.createdAt, context.now)
})

test('rejects invalid injected IDs and duplicate generated candidate IDs', () => {
  const whitespaceInput = createPipelineInput('721')
  assert.throws(() =>
    normalize(
      whitespaceInput.candidatePayload,
      whitespaceInput.canonicalNotice,
      createAdapterContext({ idFactory: () => '   ' }),
    ),
  )

  const duplicateInput = createPipelineInput('720')
  let evidenceSequence = 0
  assert.throws(() =>
    normalize(
      duplicateInput.candidatePayload,
      duplicateInput.canonicalNotice,
      createAdapterContext({
        idFactory: (entityType) => {
          if (entityType === 'extraction') return 'extraction-id'
          if (entityType === 'calendar_event_candidate') return 'duplicate-id'
          evidenceSequence += 1
          return `evidence-${evidenceSequence}`
        },
      }),
    ),
  )
})

test('adapter arguments are strict and caller inputs are not mutated', () => {
  const { candidatePayload, canonicalNotice } = createPipelineInput('721')
  const originalPayload = structuredClone(candidatePayload)
  const originalCanonical = structuredClone(canonicalNotice)

  normalize(candidatePayload, canonicalNotice)

  assert.deepEqual(candidatePayload, originalPayload)
  assert.deepEqual(canonicalNotice, originalCanonical)
  assert.throws(() =>
    normalizeKnuRuleCandidatesToExtractionResult({
      candidatePayload,
      canonicalNotice,
      context: createAdapterContext(),
      extra: true,
    }),
  )
})
