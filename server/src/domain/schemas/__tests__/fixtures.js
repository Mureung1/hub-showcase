export const FIXED_TIMESTAMP = '2026-07-10T10:00:00+09:00'
export const ALL_CAMPUSES = [
  'chuncheon',
  'samcheok',
  'dogye',
  'gangneung_wonju',
]

export function createSourceBoard(overrides = {}) {
  return {
    boardId: 'board-1',
    institutionId: 'kangwon',
    boardKey: 'school-notice',
    displayName: 'School Notice',
    category: 'school_notice',
    canonical: true,
    aliasBoardIds: [],
    listUrl: 'https://example.com/notices',
    noticeTypeHint: 'school_notice',
    supportedCampusFilters: ['chuncheon'],
    ...overrides,
  }
}

export function createListedCampusClassification(overrides = {}) {
  return {
    rawLabel: '전체',
    campuses: [...ALL_CAMPUSES],
    scope: 'all',
    ...overrides,
  }
}

export function createAttachmentRef(overrides = {}) {
  return {
    attachmentId: 'attachment-1',
    fileName: 'notice.pdf',
    sourceUrl: 'https://example.com/notice.pdf',
    serverName: null,
    sourcePath: null,
    mediaType: 'application/pdf',
    fileExtension: 'pdf',
    fetchedAt: FIXED_TIMESTAMP,
    sizeBytes: 0,
    contentHash: 'attachment-hash',
    extractionStatus: 'downloaded',
    normalizedText: null,
    errorCode: null,
    ...overrides,
  }
}

export function createCrawledNotice(overrides = {}) {
  return {
    schemaVersion: 1,
    crawledNoticeId: 'crawled-1',
    institutionId: 'kangwon',
    sourceInstitutionKey: 'knu',
    sourceBoard: createSourceBoard(),
    sourcePostId: '12345',
    sourceUrl: 'https://example.com/notices/12345',
    canonicalSourceUrl: 'https://example.com/notices/12345',
    title: 'Test notice',
    publishedAt: '2026-07-10',
    fetchedAt: FIXED_TIMESTAMP,
    contentText: 'Extracted notice content',
    contentExtractionStatus: 'extracted',
    listedCampusClassification: createListedCampusClassification(),
    attachments: [createAttachmentRef()],
    rawSourceHash: null,
    contentHash: 'content-hash',
    sourceIdentityKey: 'kangwon:school_notice:12345',
    crawlStatus: 'active',
    ...overrides,
  }
}

export function createCanonicalCampusMetadata(overrides = {}) {
  return {
    listedCampusClassification: createListedCampusClassification(),
    targetScope: 'all',
    targetCampuses: [...ALL_CAMPUSES],
    excludedCampuses: [],
    targetCampusBasis: 'common_board_default',
    campusReviewRequired: false,
    campusReviewReasons: [],
    ...overrides,
  }
}

export function createCanonicalNotice(overrides = {}) {
  return {
    schemaVersion: 1,
    noticeId: 'notice-1',
    sourceKind: 'crawler',
    institutionId: 'kangwon',
    sourceBoard: createSourceBoard(),
    sourcePostId: '12345',
    sourceUrl: 'https://example.com/notices/12345',
    canonicalSourceUrl: 'https://example.com/notices/12345',
    title: 'Test notice',
    publishedAt: '2026-07-10',
    normalizedText: 'Normalized notice content',
    attachments: [createAttachmentRef()],
    boardCategory: 'school_notice',
    noticeType: 'school_notice',
    noticeTypeBasis: 'board_hint',
    noticeTypeConflict: false,
    campus: createCanonicalCampusMetadata(),
    contentHash: 'content-hash',
    semanticContentHash: 'semantic-hash',
    revision: 1,
    status: 'active',
    supersededByNoticeId: null,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  }
}

export function createEvidenceRef(overrides = {}) {
  return {
    evidenceId: 'evidence-1',
    exactText: '2026-07-20까지 신청',
    sourcePart: 'body',
    attachmentId: null,
    exactMatch: true,
    startOffset: 0,
    endOffset: 18,
    sourceLineIndex: 0,
    ...overrides,
  }
}

export function createExtractionItem(overrides = {}) {
  return {
    schemaVersion: 1,
    itemId: 'item-1',
    extractionId: 'extraction-1',
    sourceNoticeId: 'notice-1',
    kind: 'deadline',
    title: 'Application deadline',
    description: '',
    dateExpression: '2026-07-20',
    normalizedDate: '2026-07-20',
    timeExpression: '',
    normalizedTime: null,
    evidence: [createEvidenceRef()],
    confidence: 'high',
    reviewRequired: false,
    reviewReasons: [],
    extractionMethod: 'rule',
    createdAt: FIXED_TIMESTAMP,
    ...overrides,
  }
}

export function createCalendarEventCandidate(overrides = {}) {
  return {
    schemaVersion: 1,
    candidateId: 'candidate-1',
    extractionId: 'extraction-1',
    sourceNoticeId: 'notice-1',
    relatedItemId: 'item-1',
    sourceCandidateKey: null,
    title: 'Application deadline',
    description: '',
    eventType: 'deadline',
    eventSubtype: 'application_deadline',
    targetActor: 'student',
    dateExpression: '2026-07-20',
    normalizedDate: '2026-07-20',
    timeExpression: '',
    normalizedTime: null,
    timezone: null,
    isAllDay: true,
    evidence: [createEvidenceRef()],
    confidence: 'high',
    reviewRequired: false,
    reviewReasons: [],
    candidateStatus: 'pending',
    suppressionReason: null,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  }
}

export function createExtractionResult(overrides = {}) {
  return {
    schemaVersion: 1,
    extractionId: 'extraction-1',
    sourceNoticeId: 'notice-1',
    extractionMethod: 'rule',
    sourceContentHash: 'content-hash',
    provider: null,
    model: null,
    promptVersion: null,
    extractorVersion: 'sf4',
    schemaContractVersion: 'noticepilot.domain.v1',
    summary: '',
    inferredTitle: null,
    detectedNoticeType: 'school_notice',
    detectedLanguage: 'ko',
    items: [createExtractionItem()],
    calendarEventCandidates: [createCalendarEventCandidate()],
    warnings: [],
    status: 'completed',
    createdAt: FIXED_TIMESTAMP,
    ...overrides,
  }
}

export function createCalendarEvent(overrides = {}) {
  return {
    schemaVersion: 1,
    eventId: 'event-1',
    sourceNoticeId: 'notice-1',
    sourceCandidateId: 'candidate-1',
    title: 'Application deadline',
    description: '',
    eventType: 'deadline',
    eventSubtype: 'application_deadline',
    targetActor: 'student',
    startDate: '2026-07-20',
    endDate: '2026-07-20',
    startTime: null,
    endTime: null,
    isAllDay: true,
    timezone: null,
    sourceUrl: null,
    evidence: [createEvidenceRef()],
    confidence: 'high',
    reviewRequired: false,
    reviewReasons: [],
    status: 'published',
    sequence: 0,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  }
}

export function createSubscriptionFeed(overrides = {}) {
  return {
    schemaVersion: 1,
    feedId: 'feed-1',
    institutionId: 'kangwon',
    selectedCampuses: ['chuncheon'],
    selectedBoardIds: ['board-1'],
    selectedNoticeTypes: ['school_notice'],
    includedEventTypes: ['deadline'],
    includeCommonNotices: true,
    includeUnknownCampusNotices: true,
    includeReviewRequired: true,
    includedTargetActors: ['student', 'applicant', 'public', 'unknown'],
    publicSlug: null,
    feedTokenHash: null,
    feedTokenPrefix: null,
    status: 'active',
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  }
}
