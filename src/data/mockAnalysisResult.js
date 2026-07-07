const mockData = {
  en: {
    noticeTitle: '2026 Fall Semester Scholarship Application Notice',
    noticeText: `2026 Fall Semester Scholarship Application Notice

Applications for the 2026 fall semester scholarship must be submitted online by July 20, 2026 at 18:00. Applicants must submit a transcript and a personal statement. Only students who completed at least 12 credits in the previous semester are eligible. Applications with missing documents may be excluded from review.`,
    analysisResult: {
      title: '2026 Fall Semester Scholarship Application Notice',
      summary:
        'Applications are accepted online until July 20, 2026 at 18:00. Applicants must submit a transcript and personal statement.',
      deadlines: [
        {
          id: 'deadline-1',
          title: 'Scholarship application deadline',
          date: '2026-07-20',
          time: '18:00',
          description: 'Submit transcript and personal statement online.',
          evidence:
            'Applications for the 2026 fall semester scholarship must be submitted online by July 20, 2026 at 18:00.',
        },
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Apply online',
          dueDate: '2026-07-20',
          completed: false,
          evidence: 'Applications must be submitted online.',
        },
        {
          id: 'task-2',
          title: 'Prepare transcript',
          dueDate: '2026-07-20',
          completed: false,
          evidence: 'Applicants must submit a transcript and a personal statement.',
        },
        {
          id: 'task-3',
          title: 'Write personal statement',
          dueDate: '2026-07-20',
          completed: false,
          evidence: 'Applicants must submit a transcript and a personal statement.',
        },
        {
          id: 'task-4',
          title: 'Check previous semester credit requirement',
          dueDate: '2026-07-20',
          completed: false,
          evidence:
            'Only students who completed at least 12 credits in the previous semester are eligible.',
        },
      ],
      submissions: [
        {
          id: 'submission-1',
          title: 'Transcript',
          evidence: 'Applicants must submit a transcript and a personal statement.',
        },
        {
          id: 'submission-2',
          title: 'Personal statement',
          evidence: 'Applicants must submit a transcript and a personal statement.',
        },
      ],
      requirements: [
        {
          id: 'requirement-1',
          text: 'Completed at least 12 credits in the previous semester.',
          evidence:
            'Only students who completed at least 12 credits in the previous semester are eligible.',
        },
      ],
      cautions: [
        {
          id: 'caution-1',
          text: 'Missing documents may lead to exclusion from review.',
          evidence:
            'Applications with missing documents may be excluded from review.',
        },
        {
          id: 'caution-2',
          text: 'The deadline includes a specific time, not just a date.',
          evidence: 'July 20, 2026 at 18:00.',
        },
      ],
      calendarEvents: [
        {
          id: 'event-1',
          title: 'Scholarship application deadline',
          startDate: '2026-07-20',
          endDate: '2026-07-21',
          time: '',
          allDay: true,
          description: 'Submit transcript and personal statement online.',
          selected: true,
          evidence:
            'Applications for the 2026 fall semester scholarship must be submitted online by July 20, 2026 at 18:00.',
        },
      ],
    },
  },
  ko: {
    noticeTitle: '2026학년도 2학기 장학금 신청 안내',
    noticeText: `2026학년도 2학기 장학금 신청 안내

2026학년도 2학기 장학금 신청은 2026년 7월 20일 18:00까지 온라인으로 제출해야 합니다. 신청자는 성적증명서와 자기소개서를 제출해야 합니다. 직전 학기 12학점 이상 이수한 학생만 지원할 수 있습니다. 제출 서류가 누락된 신청서는 심사에서 제외될 수 있습니다.`,
    analysisResult: {
      title: '2026학년도 2학기 장학금 신청 안내',
      summary:
        '장학금 신청은 2026년 7월 20일 18:00까지 온라인으로 제출해야 하며, 성적증명서와 자기소개서가 필요합니다.',
      deadlines: [
        {
          id: 'deadline-1',
          title: '장학금 신청 마감',
          date: '2026-07-20',
          time: '18:00',
          description: '성적증명서와 자기소개서를 온라인으로 제출합니다.',
          evidence:
            '2026학년도 2학기 장학금 신청은 2026년 7월 20일 18:00까지 온라인으로 제출해야 합니다.',
        },
      ],
      tasks: [
        {
          id: 'task-1',
          title: '온라인 신청하기',
          dueDate: '2026-07-20',
          completed: false,
          evidence: '온라인으로 제출해야 합니다.',
        },
        {
          id: 'task-2',
          title: '성적증명서 준비하기',
          dueDate: '2026-07-20',
          completed: false,
          evidence: '신청자는 성적증명서와 자기소개서를 제출해야 합니다.',
        },
        {
          id: 'task-3',
          title: '자기소개서 작성하기',
          dueDate: '2026-07-20',
          completed: false,
          evidence: '신청자는 성적증명서와 자기소개서를 제출해야 합니다.',
        },
        {
          id: 'task-4',
          title: '직전 학기 이수 학점 확인하기',
          dueDate: '2026-07-20',
          completed: false,
          evidence: '직전 학기 12학점 이상 이수한 학생만 지원할 수 있습니다.',
        },
      ],
      submissions: [
        {
          id: 'submission-1',
          title: '성적증명서',
          evidence: '신청자는 성적증명서와 자기소개서를 제출해야 합니다.',
        },
        {
          id: 'submission-2',
          title: '자기소개서',
          evidence: '신청자는 성적증명서와 자기소개서를 제출해야 합니다.',
        },
      ],
      requirements: [
        {
          id: 'requirement-1',
          text: '직전 학기 12학점 이상 이수',
          evidence: '직전 학기 12학점 이상 이수한 학생만 지원할 수 있습니다.',
        },
      ],
      cautions: [
        {
          id: 'caution-1',
          text: '제출 서류가 누락되면 심사에서 제외될 수 있습니다.',
          evidence: '제출 서류가 누락된 신청서는 심사에서 제외될 수 있습니다.',
        },
        {
          id: 'caution-2',
          text: '마감일에 시간이 포함되어 있으므로 날짜와 시간을 모두 확인해야 합니다.',
          evidence: '2026년 7월 20일 18:00까지',
        },
      ],
      calendarEvents: [
        {
          id: 'event-1',
          title: '장학금 신청 마감',
          startDate: '2026-07-20',
          endDate: '2026-07-21',
          time: '',
          allDay: true,
          description: '성적증명서와 자기소개서를 온라인으로 제출합니다.',
          selected: true,
          evidence:
            '2026학년도 2학기 장학금 신청은 2026년 7월 20일 18:00까지 온라인으로 제출해야 합니다.',
        },
      ],
    },
  },
}

export const mockNoticeTitle = mockData.en.noticeTitle
export const mockNoticeText = mockData.en.noticeText

export function getMockNotice(language = 'en') {
  return mockData[language] ?? mockData.en
}

export function createMockAnalysisResult(language = 'en') {
  const selectedMock = getMockNotice(language)
  return structuredClone(selectedMock.analysisResult)
}
