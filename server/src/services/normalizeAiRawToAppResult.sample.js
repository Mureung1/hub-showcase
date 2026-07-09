import { normalizeAiRawToAppResult } from './normalizeAiRawToAppResult.js'

const sampleAiRawAnalysis = {
  summary:
    'Scholarship applications are due on July 20, 2026, with required documents and eligibility rules.',
  items: [
    {
      kind: 'deadline',
      title: 'Scholarship application deadline',
      description: 'Submit the scholarship application online.',
      dateExpression: 'July 20, 2026',
      normalizedDate: '2026-07-20',
      evidence: 'Applications must be submitted online by July 20, 2026.',
      confidence: 'high',
      reviewRequired: false,
    },
    {
      kind: 'submission',
      title: 'Transcript',
      description: 'Applicants must submit a transcript.',
      dateExpression: '',
      normalizedDate: '',
      evidence: 'Applicants must submit a transcript and a personal statement.',
      confidence: 'high',
      reviewRequired: false,
    },
    {
      kind: 'requirement',
      title: 'Previous semester credits',
      description: 'Applicants must have completed at least 12 credits.',
      dateExpression: '',
      normalizedDate: '',
      evidence:
        'Only students who completed at least 12 credits in the previous semester are eligible.',
      confidence: 'high',
      reviewRequired: false,
    },
    {
      kind: 'caution',
      title: 'Missing documents',
      description: 'Applications with missing documents may be excluded.',
      dateExpression: 'after submission',
      normalizedDate: '',
      evidence: 'Applications with missing documents may be excluded from review.',
      confidence: 'medium',
      reviewRequired: true,
    },
  ],
  calendarEventCandidates: [
    {
      title: 'Scholarship application deadline',
      eventType: 'deadline',
      dateExpression: 'July 20, 2026',
      normalizedDate: '2026-07-20',
      evidence: 'Applications must be submitted online by July 20, 2026.',
      confidence: 'high',
      reviewRequired: false,
    },
  ],
  warnings: [
    {
      type: 'sample_fixture',
      message: 'This sample validates the local AI raw normalizer only.',
    },
  ],
}

const normalizedResult = normalizeAiRawToAppResult(sampleAiRawAnalysis, {
  noticeTitle: '2026 Fall Semester Scholarship Application Notice',
  userSelectedNoticeType: 'scholarship',
  noticePublicationDate: '2026-07-01',
})

console.log(JSON.stringify(normalizedResult, null, 2))
