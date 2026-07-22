export const mentorApplications = [
  {
    id: "mentor-application-001",
    mentorId: "kim-oo",
    status: "pending",
    createdAt: "2026-07-15T09:40:00+09:00",
    mentee: {
      id: "mentee-001",
      name: "박서연",
      school: "서울대학교",
      major: "재료공학",
      academicStatus: "4학년 재학",
    },
    questionnaire: {
      introduction: "재료공학과 4학년으로 반도체 소재와 에너지 저장 분야 대학원 진학을 준비하고 있습니다.",
      concern: "관심 있는 연구 분야가 여러 개라 연구실과 세부 주제를 정하는 기준이 궁금합니다.",
      goal: "대학원 지원 전 준비해야 할 연구 경험과 연구실 선택 기준을 구체적으로 알고 싶습니다.",
      preferredTime: "화요일 19:00, 금요일 15:00",
    },
  },
  {
    id: "mentor-application-002",
    mentorId: "kim-oo",
    status: "pending",
    createdAt: "2026-07-14T16:20:00+09:00",
    mentee: {
      id: "mentee-002",
      name: "이도윤",
      school: "연세대학교",
      major: "신소재공학",
      academicStatus: "3학년 재학",
    },
    questionnaire: {
      introduction: "신소재공학과 3학년이며 차세대 반도체 소자와 나노소재 연구에 관심이 있습니다.",
      concern: "학부 연구생을 시작하기 전에 어떤 전공 지식과 실험 역량을 준비해야 할지 고민입니다.",
      goal: "학부 연구생 지원 준비와 실제 연구실 생활에 대한 조언을 얻고 싶습니다.",
      preferredTime: "월요일 20:00, 목요일 18:30",
    },
  },
  {
    id: "mentor-application-003",
    mentorId: "kim-oo",
    status: "confirmed",
    createdAt: "2026-07-10T11:15:00+09:00",
    mentee: {
      id: "mentee-003",
      name: "최민지",
      school: "고려대학교",
      major: "화공생명공학",
      academicStatus: "4학년 재학",
    },
    meeting: {
      time: "2026년 7월 18일 19:00",
      place: "Google Meet",
    },
    questionnaire: {
      introduction: "화공생명공학과 4학년이며 배터리 소재 연구로 대학원 진학을 준비하고 있습니다.",
      concern: "자대 대학원과 타대 대학원 중 어느 쪽에 지원할지 결정하기 어렵습니다.",
      goal: "연구 환경과 지도 방식 등을 비교하는 현실적인 기준을 얻고 싶습니다.",
      preferredTime: "화요일 19:00",
    },
  },
  {
    id: "mentor-application-004",
    mentorId: "kim-oo",
    status: "completed",
    createdAt: "2026-06-30T13:05:00+09:00",
    mentee: {
      id: "mentee-004",
      name: "정하준",
      school: "성균관대학교",
      major: "전자전기공학",
      academicStatus: "졸업 예정",
    },
    meeting: {
      time: "2026년 7월 8일 15:00",
      place: "KAIST 학술문화관 1층 라운지",
    },
    questionnaire: {
      introduction: "전자전기공학 전공으로 반도체 공정과 소자 연구에 관심이 있습니다.",
      concern: "산업체 취업과 대학원 진학 중 장기적인 진로 방향을 결정하기 어렵습니다.",
      goal: "반도체 연구 직무와 대학원 과정의 차이를 이해하고 진로 계획을 세우고 싶습니다.",
      preferredTime: "금요일 15:00",
    },
  },
  {
    id: "mentor-application-005",
    mentorId: "kim-oo",
    status: "rejected",
    createdAt: "2026-06-26T17:30:00+09:00",
    mentee: {
      id: "mentee-005",
      name: "한유진",
      school: "한양대학교",
      major: "에너지공학",
      academicStatus: "3학년 재학",
    },
    questionnaire: {
      introduction: "에너지공학과 3학년으로 이차전지 소재 연구와 대학원 진학에 관심이 있습니다.",
      concern: "전공 수업 외에 대학원 진학을 위해 어떤 활동을 준비해야 할지 고민입니다.",
      goal: "연구 경험을 쌓는 순서와 학부 연구생 지원 시기를 알고 싶습니다.",
      preferredTime: "수요일 18:00, 금요일 15:00",
    },
  },
];

export function getMentorApplicationById(applicationId) {
  return mentorApplications.find((application) => application.id === applicationId);
}

export function getMentorApplicationsByMentorId(mentorId) {
  return mentorApplications.filter((application) => application.mentorId === mentorId);
}
