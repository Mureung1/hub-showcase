// ============================================================================
// utils/realtimeStatus.js — 실시간 혼잡 상태(status) → 화면 표시 정보 매핑
// ----------------------------------------------------------------------------
// [백엔드 계약] 백엔드가 주는 실시간 상태 문자열(RealtimeStatus enum의 name)을
//   화면용 한글 라벨 + CSS 색 클래스로 바꾼다. 검색 카드·상세 화면이 공용으로 쓴다.
//
//   백엔드 status 값     → 의미        → 색 토큰(tokens.css)
//   "SPACIOUS"           여유          --ok   (초록)
//   "MODERATE"           보통          --warn (노랑)
//   "BUSY"               혼잡          --busy (빨강)
//   "FULL"               만차          --busy (빨강, 혼잡의 극단이라 색 공유)
//   null (실시간 없음)   정보없음      --none (회색)
//
// [왜 유틸로 분리?] 백엔드 enum 문자열 ↔ 화면 표현(한글·색)의 매핑을 한 곳에 모으면,
//   검색·상세 어디서든 같은 규칙으로 표시되고, 상태가 늘어도 여기만 고치면 된다.
// ============================================================================

// status 문자열 → { 라벨, 색 클래스 }. 백엔드 RealtimeStatus enum name과 1:1 대응.
// 라벨에 "자리"를 붙여 "주차 자리 여유/보통/혼잡"임을 명확히 한다(유료/무료와 헷갈리지 않게).
const REALTIME_STATUS = {
  SPACIOUS: { label: '자리 여유', modifier: 'ok' },
  MODERATE: { label: '자리 보통', modifier: 'warn' },
  BUSY: { label: '자리 혼잡', modifier: 'busy' },
  FULL: { label: '만차', modifier: 'busy' },
};

// 실시간이 없을 때(status === null/undefined) 쓰는 기본값 = 실시간 미제공.
const NONE_STATUS = { label: '실시간 정보 미제공', modifier: 'none' };

/**
 * 백엔드 status 문자열 → 화면 표시 정보({ label, modifier }).
 * 매칭되는 값이 없거나 null이면 '정보없음'.
 *
 * @param {string|null|undefined} status 백엔드 실시간 상태 (SPACIOUS/MODERATE/BUSY/FULL)
 * @returns {{ label: string, modifier: string }} 한글 라벨 + 색 클래스 접미사
 */
export function toRealtimeStatus(status) {
  // ?? 아님에 주의: 키가 없으면 undefined → NONE_STATUS 로 폴백.
  return REALTIME_STATUS[status] ?? NONE_STATUS;
}
