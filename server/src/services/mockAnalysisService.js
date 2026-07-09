const defaultNoticeText =
  'Applications must be submitted online by the stated deadline. Applicants should review requirements and prepare all requested documents before submission.'
const activeInstitution = 'kangwon'
const campusOrder = ['chuncheon', 'samcheok', 'dogye', 'gangneung_wonju']
const campusIdSet = new Set(campusOrder)

function normalizeString(value) {
  return typeof value === 'string' ? value : ''
}

function pickNoticeText(input) {
  return (
    normalizeString(input?.noticeText) ||
    normalizeString(input?.extractedText) ||
    normalizeString(input?.sourceText) ||
    defaultNoticeText
  )
}

function pickTitle(input, language) {
  const noticeTitle = normalizeString(input?.noticeTitle)

  if (noticeTitle) {
    return noticeTitle
  }

  return language === 'ko'
    ? '서버 mock 공지 분석'
    : 'Server mock notice analysis'
}

function pickLanguage(input, noticeText) {
  const language = normalizeString(input?.language)

  if (language === 'ko' || language === 'en') {
    return language
  }

  return /[가-힣]/.test(noticeText) ? 'ko' : 'en'
}

function firstEvidenceLine(noticeText) {
  return noticeText.split('\n').find((line) => line.trim()) || noticeText
}

function normalizeUserPreferencesSnapshot(snapshot) {
  const selectedCampusSet = new Set(
    Array.isArray(snapshot?.selectedCampuses)
      ? snapshot.selectedCampuses.filter((campusId) => campusIdSet.has(campusId))
      : [],
  )

  return {
    activeInstitution,
    selectedCampuses: campusOrder.filter((campusId) =>
      selectedCampusSet.has(campusId),
    ),
    includeCommonNotices: true,
  }
}

export async function analyzeWithMock(input = {}) {
  const noticeText = pickNoticeText(input)
  const language = pickLanguage(input, noticeText)
  const title = pickTitle(input, language)
  const evidence = firstEvidenceLine(noticeText)
  const isKorean = language === 'ko'
  const userPreferencesSnapshot = normalizeUserPreferencesSnapshot(
    input?.userPreferencesSnapshot,
  )

  return {
    title,
    summary: isKorean
      ? '서버 mock 분석 결과입니다. 실제 AI 호출 없이 프론트엔드와 동일한 schema를 검증합니다.'
      : 'This is a server mock analysis result. It validates the current frontend schema without calling a real AI API.',
    detectedNoticeType: 'server_mock',
    userSelectedNoticeType: normalizeString(input?.userSelectedNoticeType) || 'unknown',
    noticePublicationDate: normalizeString(input?.noticePublicationDate),
    uploadedFileName: normalizeString(input?.uploadedFileName),
    metadata: {
      userPreferencesSnapshot,
    },
    deadlines: [
      {
        id: 'server-deadline-1',
        title: isKorean ? '서버 mock 마감일' : 'Server mock deadline',
        date: '2026-07-20',
        time: '',
        description: isKorean
          ? '실제 날짜 추론은 다음 AI 연동 단계에서 구현합니다.'
          : 'Real date extraction will be implemented in a later AI integration phase.',
        evidence,
      },
    ],
    tasks: [
      {
        id: 'server-task-1',
        title: isKorean ? '공지 본문 검토하기' : 'Review the notice text',
        dueDate: '2026-07-20',
        completed: false,
        evidence,
      },
      {
        id: 'server-task-2',
        title: isKorean
          ? '필요한 제출물과 조건 확인하기'
          : 'Confirm required submissions and requirements',
        dueDate: '2026-07-20',
        completed: false,
        evidence,
      },
    ],
    submissions: [
      {
        id: 'server-submission-1',
        title: isKorean ? '서버 mock 제출물' : 'Server mock submission',
        evidence,
      },
    ],
    requirements: [
      {
        id: 'server-requirement-1',
        text: isKorean
          ? '실제 지원 조건 추출은 아직 연결되지 않았습니다.'
          : 'Real requirement extraction is not connected yet.',
        evidence,
      },
    ],
    cautions: [
      {
        id: 'server-caution-1',
        text: isKorean
          ? '이 결과는 backend skeleton 검증용 mock 결과입니다.'
          : 'This result is a mock response for backend skeleton verification.',
        evidence,
      },
    ],
    calendarEvents: [
      {
        id: 'server-event-1',
        title: isKorean ? '서버 mock 일정' : 'Server mock calendar event',
        startDate: '2026-07-20',
        endDate: '2026-07-21',
        time: '',
        allDay: true,
        description: isKorean
          ? '선택된 valid all-day event export schema를 확인합니다.'
          : 'Checks the selected valid all-day event export schema.',
        selected: true,
        evidence,
      },
    ],
    warnings: [
      {
        type: 'server_mock_analysis',
        message: isKorean
          ? '서버 mock 분석입니다. 실제 AI API는 아직 호출하지 않습니다.'
          : 'Server mock analysis only. No real AI API call was made.',
      },
    ],
  }
}
