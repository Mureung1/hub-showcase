// Mock 일정 분석 데이터
// 주의: 이것은 Mock 데이터입니다. 실제 구현 시 OpenAI API로 교체됩니다.
const mockResponses = {
  complete: {
    scheduleName: "2024 CalMe 겨울 해커톤",
    startDate: "2024-12-15",
    deadline: "2024-12-31",
    location: "서울대학교 공학관 301호",
    deliverables: [
      "프로젝트 결과물 (GitHub 링크)",
      "발표 자료 (PPT 또는 PDF)",
      "팀 소개 및 프로젝트 설명서",
    ],
    materials: ["노트북", "신분증", "충전기"],
    notes: [
      "사전 등록 필수 (12월 10일까지)",
      "팀 구성은 2-4명",
      "본선 진출팀에 상품 지급",
    ],
    warnings: [],
  },
  incomplete: {
    scheduleName: "겨울 방학 프로젝트",
    startDate: null,
    deadline: "2025-01-31",
    location: null,
    deliverables: ["최종 보고서"],
    materials: [],
    notes: ["온라인 제출"],
    warnings: [
      "시작일을 찾을 수 없습니다",
      "장소 정보가 불명확합니다",
    ],
  },
};

// Mock 분석 함수
// 텍스트 길이에 따라 다른 응답을 반환합니다 (실제 분석이 아님)
export async function analyzeNotice(text) {
  if (!text || text.trim().length === 0) {
    throw new Error("분석할 텍스트가 없습니다");
  }

  // Mock 로직: 텍스트 길이로 응답 선택
  // 실제 구현 시에는 여기서 OpenAI API를 호출합니다
  const response =
    text.length > 200 ? mockResponses.complete : mockResponses.incomplete;

  // 응답 검증 및 정규화
  return validateAnalysisResponse(response);
}

// 분석 응답 검증 및 정규화
function validateAnalysisResponse(response) {
  return {
    scheduleName: response.scheduleName || null,
    startDate: response.startDate || null,
    deadline: response.deadline || null,
    location: response.location || null,
    deliverables: Array.isArray(response.deliverables)
      ? response.deliverables
      : [],
    materials: Array.isArray(response.materials) ? response.materials : [],
    notes: Array.isArray(response.notes) ? response.notes : [],
    warnings: Array.isArray(response.warnings) ? response.warnings : [],
  };
}
