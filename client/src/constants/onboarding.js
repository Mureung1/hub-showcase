export const TOUR_IDS = {
  menteeMentorList: "menteeMentorList",
  menteeQuestionnaire: "menteeQuestionnaire",
};

// 서버 PATCH /mentees/me/onboarding의 tour 값 및 currentUser에 담기는 완료 시각 필드명.
export const TOUR_SERVER_KEYS = {
  [TOUR_IDS.menteeMentorList]: {
    tour: "mentorList",
    userField: "mentorListOnboardedAt",
  },
  [TOUR_IDS.menteeQuestionnaire]: {
    tour: "questionnaire",
    userField: "questionnaireOnboardedAt",
  },
};

export const menteeMentorListTourSteps = [
  {
    target: '[data-onboarding="mentor-card"]',
    message: "멘토 카드로 멘토의 정보를 확인할 수 있어요.",
    placement: "bottom",
  },
  {
    target: '[data-onboarding="mentor-detail"]',
    message: "'프로필 상세 보기'를 누르면 더 상세한 프로필을 볼 수 있어요.",
    placement: "top",
  },
  {
    target: '[data-onboarding="filter"]',
    message: "'필터'를 눌러 원하는 조건으로 멘토를 검색할 수 있어요.",
    placement: "bottom",
  },
  {
    target: '[data-onboarding="mentor-select"]',
    message: "체크박스를 누르면 멘토를 선택할 수 있어요. 최대 3명까지 선택할 수 있어요.",
    placement: "bottom",
  },
  {
    target: '[data-onboarding="apply"]',
    message: "멘토를 고르고 '면담 신청'을 누르면 사전 질문지 작성으로 넘어가요.",
    placement: "top",
  },
  {
    target: '[data-onboarding="application-list"]',
    message: "신청한 면담의 진행 상황은 '면담 신청 목록'에서 확인할 수 있어요.",
    placement: "bottom",
  },
];

export const menteeQuestionnaireTourSteps = [
  {
    target: '[data-onboarding="questionnaire-form"]',
    message: "4개의 칸을 모두 채우고 '면담 신청 제출'을 누르면 신청이 완료돼요.",
    placement: "top",
  },
];
