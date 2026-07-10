import assert from 'node:assert/strict'
import test from 'node:test'
import { projectExtractionResultToAppAnalysis } from '../index.js'
import {
  createCalendarEventCandidate,
  createEvidenceRef,
  createExtractionItem,
  createExtractionResult,
  createProjectionContext,
} from './fixtures.js'

test('all extraction item kinds route to their App sections', () => {
  const kinds = ['deadline', 'task', 'submission', 'requirement', 'caution']
  const items = kinds.map((kind) =>
    createExtractionItem({
      itemId: `item-${kind}`,
      kind,
      title: `${kind} title`,
      evidence: [
        createEvidenceRef({
          evidenceId: `evidence-${kind}-1`,
          exactText: `${kind} first evidence`,
        }),
        createEvidenceRef({
          evidenceId: `evidence-${kind}-2`,
          exactText: `${kind} second evidence`,
        }),
      ],
    }),
  )
  const projected = projectExtractionResultToAppAnalysis({
    extractionResult: createExtractionResult({
      items,
      calendarEventCandidates: [],
    }),
    projectionContext: createProjectionContext(),
  })

  assert.equal(projected.deadlines[0].id, 'item-deadline')
  assert.equal(projected.tasks[0].id, 'item-task')
  assert.equal(projected.submissions[0].id, 'item-submission')
  assert.equal(projected.requirements[0].id, 'item-requirement')
  assert.equal(projected.cautions[0].id, 'item-caution')
  assert.equal(projected.deadlines[0].evidence, 'deadline first evidence')
})

test('nullable dates and times become legacy empty strings with UI flags', () => {
  const projected = projectExtractionResultToAppAnalysis({
    extractionResult: createExtractionResult({
      items: [
        createExtractionItem({
          kind: 'deadline',
          normalizedDate: null,
          normalizedTime: null,
        }),
        createExtractionItem({
          itemId: 'item-task-2',
          kind: 'task',
        }),
      ],
      calendarEventCandidates: [],
    }),
    projectionContext: createProjectionContext(),
  })

  assert.equal(projected.deadlines[0].date, '')
  assert.equal(projected.deadlines[0].time, '')
  assert.equal(projected.deadlines[0].normalizedDate, '')
  assert.equal(projected.deadlines[0].edited, false)
  assert.equal(projected.tasks[0].completed, false)
  assert.equal(projected.tasks[0].edited, false)
})

test('candidate projection handles selection and next-day date boundaries', () => {
  const candidates = [
    createCalendarEventCandidate({
      candidateId: 'candidate-year-end',
      relatedItemId: null,
      normalizedDate: '2026-12-31',
      isAllDay: null,
    }),
    createCalendarEventCandidate({
      candidateId: 'candidate-leap-day',
      relatedItemId: null,
      normalizedDate: '2024-02-29',
      isAllDay: true,
    }),
    createCalendarEventCandidate({
      candidateId: 'candidate-undated',
      relatedItemId: null,
      normalizedDate: null,
      isAllDay: null,
      reviewRequired: true,
      reviewReasons: ['ambiguous_date'],
    }),
  ]
  const projected = projectExtractionResultToAppAnalysis({
    extractionResult: createExtractionResult({
      items: [],
      calendarEventCandidates: candidates,
    }),
    projectionContext: createProjectionContext(),
  })

  assert.equal(projected.calendarEvents[0].startDate, '2026-12-31')
  assert.equal(projected.calendarEvents[0].endDate, '2027-01-01')
  assert.equal(projected.calendarEvents[0].selected, true)
  assert.equal(projected.calendarEvents[0].allDay, true)
  assert.equal(projected.calendarEvents[1].endDate, '2024-03-01')
  assert.equal(projected.calendarEvents[2].startDate, '')
  assert.equal(projected.calendarEvents[2].endDate, '')
  assert.equal(projected.calendarEvents[2].selected, false)
})

test('timed state and description evidence fallback remain App-compatible', () => {
  const projected = projectExtractionResultToAppAnalysis({
    extractionResult: createExtractionResult({
      items: [],
      calendarEventCandidates: [
        createCalendarEventCandidate({
          relatedItemId: null,
          normalizedTime: '10:30',
          timezone: 'Asia/Seoul',
          isAllDay: false,
          description: '',
          evidence: [
            createEvidenceRef({
              evidenceId: 'candidate-evidence',
              exactText: 'Candidate evidence text',
            }),
          ],
        }),
      ],
    }),
    projectionContext: createProjectionContext({ referenceDate: '2026-07-01' }),
  })
  const event = projected.calendarEvents[0]

  assert.equal(event.allDay, false)
  assert.equal(event.time, '10:30')
  assert.equal(event.description, 'Candidate evidence text')
  assert.equal(event.evidence, 'Candidate evidence text')
  assert.equal(event.dateSource, 'core_extraction')
  assert.equal(event.referenceDate, '2026-07-01')
})

test('warning references are removed from the App projection', () => {
  const projected = projectExtractionResultToAppAnalysis({
    extractionResult: createExtractionResult({
      warnings: [
        {
          type: 'item_warning',
          message: 'Review item',
          itemId: 'item-1',
          candidateId: null,
        },
      ],
    }),
    projectionContext: createProjectionContext(),
  })

  assert.deepEqual(projected.warnings, [
    { type: 'item_warning', message: 'Review item' },
  ])
})

test('preferences metadata is optional and otherwise preserved', () => {
  const extractionResult = createExtractionResult()
  const withoutMetadata = projectExtractionResultToAppAnalysis({
    extractionResult,
    projectionContext: createProjectionContext(),
  })
  const snapshot = {
    activeInstitution: 'kangwon',
    selectedCampuses: ['chuncheon'],
    includeCommonNotices: true,
  }
  const withMetadata = projectExtractionResultToAppAnalysis({
    extractionResult,
    projectionContext: createProjectionContext({
      userPreferencesSnapshot: snapshot,
    }),
  })

  assert.equal('metadata' in withoutMetadata, false)
  assert.deepEqual(withMetadata.metadata.userPreferencesSnapshot, snapshot)
})

test('projection arguments and context are strict', () => {
  const extractionResult = createExtractionResult()
  const projectionContext = createProjectionContext()

  assert.throws(() =>
    projectExtractionResultToAppAnalysis({
      extractionResult,
      projectionContext: { ...projectionContext, extra: true },
    }),
  )
  assert.throws(() =>
    projectExtractionResultToAppAnalysis({
      extractionResult,
      projectionContext,
      extra: true,
    }),
  )
})

test('projection does not mutate the core ExtractionResult', () => {
  const extractionResult = createExtractionResult()
  const before = structuredClone(extractionResult)

  projectExtractionResultToAppAnalysis({
    extractionResult,
    projectionContext: createProjectionContext(),
  })

  assert.deepEqual(extractionResult, before)
})
