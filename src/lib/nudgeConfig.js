// 넛지 엔진 관련 설정값 모음.
// 매직넘버를 컴포넌트 곳곳에 박지 않고 여기 한 곳에서만 관리한다.

// 무응답 판정 간격(ms). 시작 예정 시각이 지난 active 할일에 대해 이 간격마다
// "무응답 1회"로 보고 skipCount를 올린다.
// 데모용으로 20초 고정 — docs/prototype.html의 TICK_MS(20000)와 동일한 값.
// 실서비스에서는 수 분~수십 분 단위로 바꾼다(이 상수만 교체하면 됨).
export const NUDGE_TICK_MS = 20000;

// 대기중(waiting) 할일의 시작 예정 시각 경과 여부를 확인하는 간격(ms).
// 도달 즉시 active로 전환하기 위한 가벼운 폴링 주기라 tick보다 짧게 둔다.
export const ACTIVATION_POLL_MS = 3000;
