import { mockAnalysisData, selectMockData } from "../constants/mockAnalysisData.js";

/**
 * 공지를 분석하여 일정 정보를 추출합니다.
 * 3주차에는 Mock 데이터를 사용합니다.
 * 4주차에는 Claude API로 교체될 예정입니다.
 *
 * @param {string} text - 분석할 공지 텍스트
 * @returns {object} 분석 결과 (notice, events 포함)
 * @throws {Error} 텍스트가 없으면 에러 발생
 */
export async function analyzeNotice(text) {
  if (!text || text.trim().length === 0) {
    throw new Error("분석할 텍스트가 없습니다");
  }

  // Mock 데이터 선택 (텍스트 내용에 따라 적절한 시나리오 선택)
  const mockData = selectMockData(text);

  // 응답 검증 및 정규화
  return validateAnalysisResponse(mockData);
}

/**
 * 분석 응답을 검증하고 정규화합니다.
 * docs/analysis-schema.md의 형식을 따릅니다.
 *
 * @param {object} response - 분석 응답 객체
 * @returns {object} 검증된 응답
 */
function validateAnalysisResponse(response) {
  // notice 필드 검증
  if (!response.notice || typeof response.notice !== "object") {
    throw new Error("공지 정보가 누락되었습니다");
  }

  const validNotice = {
    title: response.notice.title || "제목 없음",
    summary: response.notice.summary || "요약 없음",
  };

  // events 필드 검증
  let validEvents = [];
  if (Array.isArray(response.events) && response.events.length > 0) {
    validEvents = response.events.map((event) => validateEvent(event));
  }

  return {
    notice: validNotice,
    events: validEvents,
  };
}

/**
 * 개별 일정을 검증합니다.
 * 필수 필드가 없으면 기본값으로 채웁니다.
 *
 * @param {object} event - 일정 객체
 * @returns {object} 검증된 일정
 */
function validateEvent(event) {
  if (!event || typeof event !== "object") {
    throw new Error("일정 데이터가 잘못되었습니다");
  }

  return {
    name: event.name || "제목 없음",
    startDate: event.startDate || null,
    endDate: event.endDate || null,
    deadline: event.deadline || null,
    time: {
      start: event.time?.start || null,
      end: event.time?.end || null,
    },
    location: event.location || null,
    deliverables: Array.isArray(event.deliverables)
      ? event.deliverables
      : [],
    notes: event.notes || null,
  };
}
