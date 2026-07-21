// 대전 시청 인근 — 지도 초기 카메라 중심 좌표(빵집들이 대체로 이 주변에 흩어져 있어 전체가 보이는 시야).
export const daejeonCenter = { lat: 36.3504, lng: 127.3845 };

// 사용자가 아직 위치를 안 정했을 때(지오로케이션 미허용/실패 포함) 쓰는 기본 출발지.
// 대전역이 대전 방문객들이 흔히 출발하는 랜드마크라 기본값으로 적합 — 실제 위치가 아니라 근사 좌표.
export const DEFAULT_USER_LOCATION = { lat: 36.3315, lng: 127.4348 };
export const DEFAULT_USER_LOCATION_LABEL = '대전역 (기본값)';
