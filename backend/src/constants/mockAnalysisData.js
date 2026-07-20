/**
 * Mock 분석 데이터
 * docs/analysis-schema.md의 JSON 스키마를 따릅니다.
 * 다양한 시나리오를 테스트하기 위한 Mock 데이터 모음입니다.
 */

export const mockAnalysisData = {
  // 시나리오 1: 정상 케이스 - 여러 일정, 모든 정보 포함
  complete: {
    notice: {
      title: "2024 CalMe 겨울 해커톤",
      summary:
        "겨울 방학 중 진행되는 해커톤입니다. 팀 단위로 참가할 수 있으며, 선발된 팀에게 상품이 지급됩니다.",
    },
    events: [
      {
        name: "팀 구성 및 신청 마감",
        startDate: "2024-12-01",
        endDate: null,
        deadline: "2024-12-10",
        time: {
          start: null,
          end: null,
        },
        location: null,
        deliverables: ["팀 구성 정보"],
        notes: "사전 등록 필수. 팀은 2-4명으로 구성",
      },
      {
        name: "해커톤 본선",
        startDate: "2024-12-15",
        endDate: "2024-12-16",
        deadline: null,
        time: {
          start: "09:00",
          end: "18:00",
        },
        location: "서울대학교 공학관 301호",
        deliverables: ["프로젝트 결과물 (GitHub)", "발표 자료 (PPT/PDF)"],
        notes: "노트북, 신분증, 충전기 준비",
      },
      {
        name: "최종 결과물 제출",
        startDate: null,
        endDate: null,
        deadline: "2024-12-31",
        time: {
          start: null,
          end: null,
        },
        location: null,
        deliverables: ["최종 보고서", "소스 코드"],
        notes: "온라인 제출 (Google Form 링크 제공 예정)",
      },
    ],
  },

  // 시나리오 2: 불완전한 케이스 - 날짜 정보 부분 누락
  incompleteDate: {
    notice: {
      title: "겨울 방학 프로젝트",
      summary:
        "프로젝트 과제 공지입니다. 마감일은 2025년 1월 31일입니다.",
    },
    events: [
      {
        name: "프로젝트 제출",
        startDate: null,
        endDate: null,
        deadline: "2025-01-31",
        time: {
          start: null,
          end: null,
        },
        location: null,
        deliverables: ["최종 보고서", "코드"],
        notes: "온라인 제출만 인정",
      },
    ],
  },

  // 시나리오 3: 일정 없음 - 공지만 있고 구체적 일정 정보 없음
  noEvent: {
    notice: {
      title: "학사공지",
      summary: "이번 학기 학사일정 안내입니다.",
    },
    events: [],
  },

  // 시나리오 4: 많은 일정 - 10개 이상의 일정
  manyEvents: {
    notice: {
      title: "2024 가을학기 강의 일정",
      summary:
        "2024 가을학기 전체 강의 일정 및 과제 마감일입니다.",
    },
    events: [
      {
        name: "강의 시작",
        startDate: "2024-09-01",
        endDate: null,
        deadline: null,
        time: { start: null, end: null },
        location: null,
        deliverables: [],
        notes: "개강일",
      },
      {
        name: "과제 1 제출",
        startDate: null,
        endDate: null,
        deadline: "2024-09-15",
        time: { start: null, end: null },
        location: null,
        deliverables: ["과제 1 보고서"],
        notes: null,
      },
      {
        name: "중간 시험",
        startDate: "2024-10-10",
        endDate: "2024-10-14",
        deadline: null,
        time: { start: "09:00", end: "11:00" },
        location: "학관 301호",
        deliverables: [],
        notes: "시험 시간 중에는 퇴실 불가",
      },
      {
        name: "과제 2 제출",
        startDate: null,
        endDate: null,
        deadline: "2024-10-20",
        time: { start: null, end: null },
        location: null,
        deliverables: ["과제 2 보고서"],
        notes: null,
      },
      {
        name: "강의 재개",
        startDate: "2024-10-21",
        endDate: null,
        deadline: null,
        time: { start: null, end: null },
        location: null,
        deliverables: [],
        notes: "중간 시험 후 재개",
      },
      {
        name: "과제 3 제출",
        startDate: null,
        endDate: null,
        deadline: "2024-11-10",
        time: { start: null, end: null },
        location: null,
        deliverables: ["과제 3 보고서"],
        notes: null,
      },
      {
        name: "특강",
        startDate: "2024-11-15",
        endDate: null,
        deadline: null,
        time: { start: "14:00", end: "15:30" },
        location: "대강당",
        deliverables: [],
        notes: "초청 교수 특강",
      },
      {
        name: "과제 4 제출",
        startDate: null,
        endDate: null,
        deadline: "2024-11-25",
        time: { start: null, end: null },
        location: null,
        deliverables: ["과제 4 보고서"],
        notes: null,
      },
      {
        name: "기말 시험",
        startDate: "2024-12-12",
        endDate: "2024-12-16",
        deadline: null,
        time: { start: "14:00", end: "16:00" },
        location: "강의실 별도 공지",
        deliverables: [],
        notes: "시험 범위: 전 범위",
      },
      {
        name: "최종 성적 공개",
        startDate: null,
        endDate: null,
        deadline: "2024-12-20",
        time: { start: null, end: null },
        location: null,
        deliverables: [],
        notes: "강의 포털에서 확인 가능",
      },
      {
        name: "성적 이의 제출",
        startDate: null,
        endDate: null,
        deadline: "2024-12-27",
        time: { start: null, end: null },
        location: null,
        deliverables: ["이의 신청서"],
        notes: "이의 제출 후 재검토",
      },
    ],
  },

  // 시나리오 5: 정보 부분 누락 - 장소, 제출물 없음
  missingDetails: {
    notice: {
      title: "학생 면담 안내",
      summary: "2024년 11월 학생 개별 면담을 진행합니다.",
    },
    events: [
      {
        name: "1차 면담 신청",
        startDate: "2024-11-01",
        endDate: null,
        deadline: "2024-11-05",
        time: { start: null, end: null },
        location: null,
        deliverables: [],
        notes: "포털에서 시간 선택",
      },
      {
        name: "1차 면담",
        startDate: "2024-11-10",
        endDate: "2024-11-14",
        deadline: null,
        time: { start: "10:00", end: "17:00" },
        location: null,
        deliverables: [],
        notes: "개별 통보 예정",
      },
    ],
  },

  // 시나리오 6: 단일 일정만 있는 경우
  singleEvent: {
    notice: {
      title: "캠퍼스 안전점검 공지",
      summary:
        "안전 점검을 위해 11월 15일 캠퍼스 일부 구간이 폐쇄됩니다.",
    },
    events: [
      {
        name: "캠퍼스 폐쇄",
        startDate: "2024-11-15",
        endDate: "2024-11-15",
        deadline: null,
        time: { start: "08:00", end: "18:00" },
        location: "중앙 광장 및 주변 도로",
        deliverables: [],
        notes: "해당 시간에 우회 통행 필수",
      },
    ],
  },

  // 시나리오 7: 시간 정보만 있는 경우
  timeOnly: {
    notice: {
      title: "학위 수여식",
      summary:
        "2024년 졸업생 학위 수여식을 개최합니다. 참석 대상자는 반드시 출석하시기 바랍니다.",
    },
    events: [
      {
        name: "학위 수여식 참석",
        startDate: null,
        endDate: null,
        deadline: null,
        time: { start: "14:00", end: "16:00" },
        location: "대강당",
        deliverables: ["졸업증명서"],
        notes: "정장 착용 권장. 가족 동반 가능",
      },
    ],
  },
};

/**
 * Mock 데이터 선택 함수
 * 텍스트 내용에 따라 적절한 Mock 데이터를 반환합니다.
 *
 * 키워드 매핑:
 * - "해커톤" → complete (정상, 여러 일정)
 * - "강의" or "학기" → manyEvents (많은 일정)
 * - "면담" → missingDetails (정보 부분 누락)
 * - "수여식" or "졸업" → timeOnly (시간만)
 * - "안전" or "폐쇄" → singleEvent (단일 일정)
 * - "학사" or "공지" or "일정" → noEvent (일정 없음)
 * - 기본값 → incompleteDate (날짜 부분 누락)
 *
 * @param {string} text - 분석할 공지 텍스트
 * @returns {object} 선택된 Mock 분석 데이터
 */
export function selectMockData(text) {
  if (!text) {
    return mockAnalysisData.noEvent;
  }

  const lowerText = text.toLowerCase();

  // 텍스트 특성에 따라 Mock 데이터 선택
  // 순서: 더 구체적인 키워드 먼저
  if (lowerText.includes("해커톤")) {
    return mockAnalysisData.complete;
  }
  if (lowerText.includes("수여식") || lowerText.includes("졸업")) {
    return mockAnalysisData.timeOnly;
  }
  if (lowerText.includes("안전") || lowerText.includes("폐쇄")) {
    return mockAnalysisData.singleEvent;
  }
  if (lowerText.includes("면담")) {
    return mockAnalysisData.missingDetails;
  }
  if (lowerText.includes("강의") || lowerText.includes("학기")) {
    return mockAnalysisData.manyEvents;
  }
  if (lowerText.includes("학사") || lowerText.includes("공지만") || lowerText.includes("일정만")) {
    return mockAnalysisData.noEvent;
  }

  // 기본값: 날짜 정보 부분 누락
  return mockAnalysisData.incompleteDate;
}
