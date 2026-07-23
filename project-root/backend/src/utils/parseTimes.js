// utils/parseTimes.js
// 강의계획서 API의 lssnsRealTimeInfo 필드를 파싱한다.
// "화 09:00 ~ 10:30,목 10:30 ~ 12:00" → [{day:"화", start:"09:00", end:"10:30"}, ...]
//
// "요일 시작시각 ~ 종료시각" 형식을 정규식으로 강제한다. 트레일링/중복 콤마로 생기는 빈 조각은
// 무시하고, 그 외에 형식에 안 맞는 조각(구분자 누락, 요일-시각 사이 공백 없음 등)은 원본 데이터
// 이상을 조용히 숨기지 않도록 에러를 던진다.
const TIME_CHUNK_PATTERN = /^(\S+)\s+(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})$/;

function parseTimes(lssnsRealTimeInfo) {
  if (!lssnsRealTimeInfo) return [];

  return lssnsRealTimeInfo
    .split(',')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const match = chunk.match(TIME_CHUNK_PATTERN);
      if (!match) {
        throw new Error(`시간 형식을 해석할 수 없습니다: "${chunk}"`);
      }
      const [, day, start, end] = match;
      return { day, start, end };
    });
}

module.exports = { parseTimes };
