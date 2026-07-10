import {
  FIXED_TIMESTAMP,
  createCalendarEventCandidate,
  createCanonicalCampusMetadata,
  createCanonicalNotice,
  createEvidenceRef,
  createExtractionItem,
  createExtractionResult,
} from '../../schemas/__tests__/fixtures.js'

export {
  FIXED_TIMESTAMP,
  createCalendarEventCandidate,
  createCanonicalCampusMetadata,
  createCanonicalNotice,
  createEvidenceRef,
  createExtractionItem,
  createExtractionResult,
}

export function createManualNoticeInput(overrides = {}) {
  return {
    title: 'Manual notice',
    normalizedText: 'Manual notice body',
    publishedAt: '2026-07-10',
    institutionId: null,
    sourceUrl: null,
    canonicalSourceUrl: null,
    boardCategory: null,
    noticeType: 'school_notice',
    campus: null,
    attachments: [],
    ...overrides,
  }
}

export function createAdapterContext(overrides = {}) {
  let sequence = 0

  return {
    now: FIXED_TIMESTAMP,
    idFactory: (entityType) => `${entityType}-${++sequence}`,
    hashText: (input) => `hash:${input}`,
    ...overrides,
  }
}

export function createExtractionMetadata(overrides = {}) {
  return {
    provider: 'legacy-provider',
    model: 'legacy-model',
    promptVersion: 'legacy-prompt-v1',
    extractorVersion: 'legacy-adapter-v1',
    ...overrides,
  }
}

export function createAiRawAnalysis(overrides = {}) {
  return {
    summary: 'Legacy AI summary',
    items: [],
    calendarEventCandidates: [],
    warnings: [],
    ...overrides,
  }
}

export function createProjectionContext(overrides = {}) {
  return {
    title: 'Projected notice',
    userSelectedNoticeType: 'school_notice',
    noticePublicationDate: '2026-07-10',
    uploadedFileName: 'notice.txt',
    referenceDate: '2026-07-10',
    ...overrides,
  }
}
