export const applications = [
  {
    id: "application-001",
    mentorIds: ["kim-oo", "lee-oo"],
    status: "pending",
    createdAt: "2026-07-14T10:30:00+09:00",
    questionnaire: {
      introduction: "재료공학과 4학년으로 반도체 소재와 AI 융합 연구에 관심이 있습니다.",
      concern: "대학원 전공과 연구실을 어떤 기준으로 선택해야 할지 고민입니다.",
      goal: "연구실 선택 기준과 입학 준비 순서를 구체적으로 알고 싶습니다.",
      preferredTime: "화요일 19:00, 목요일 18:30",
    },
  },
  {
    id: "application-002",
    mentorIds: ["park-oo"],
    acceptedMentorId: "park-oo",
    status: "confirmed",
    createdAt: "2026-07-08T15:10:00+09:00",
    meeting: {
      method: "온라인",
      time: "2026년 7월 22일 17:00",
      place: "Google Meet · 링크는 면담 전 공개",
    },
    questionnaire: {
      introduction: "생명과학과 3학년이며 계산생물학 대학원 진학을 준비하고 있습니다.",
      concern: "프로그래밍 경험이 부족해 융합 연구를 시작하는 방법이 궁금합니다.",
      goal: "계산생물학 연구에 필요한 역량과 준비 방법을 알고 싶습니다.",
      preferredTime: "수요일 17:00",
    },
  },
  {
    id: "application-003",
    mentorIds: ["choi-oo"],
    acceptedMentorId: "choi-oo",
    status: "completed",
    createdAt: "2026-07-02T09:20:00+09:00",
    meeting: {
      method: "오프라인",
      time: "2026년 7월 10일 13:00",
      place: "서울대학교 39동 2층 라운지",
    },
    questionnaire: {
      introduction: "산업공학 전공으로 UX 리서치와 기술 창업에 관심이 있습니다.",
      concern: "취업과 대학원 진학 중 어떤 진로를 선택할지 고민입니다.",
      goal: "각 진로의 준비 과정과 실제 경험을 비교해 보고 싶습니다.",
      preferredTime: "금요일 18:00",
    },
  },
  {
    id: "application-004",
    mentorIds: ["kim-oo", "park-oo"],
    status: "rejected",
    createdAt: "2026-06-28T11:40:00+09:00",
    questionnaire: {
      introduction: "화학공학과 4학년으로 에너지 소재와 바이오 데이터 연구에 관심이 있습니다.",
      concern: "서로 다른 연구 분야 중 제 적성에 맞는 분야를 결정하기 어렵습니다.",
      goal: "대학원 연구 분야를 비교하고 준비 방향을 정하고 싶습니다.",
      preferredTime: "화요일 19:00, 토요일 11:00",
    },
  },
];

export function getApplicationById(applicationId) {
  return applications.find((application) => application.id === applicationId);
}
