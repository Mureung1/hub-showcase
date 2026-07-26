// ============================================================================
// utils/distanceText.js — 거리 정보(백엔드 사실) → 화면 문구
// ----------------------------------------------------------------------------
// [왜 따로 두나] 목록 카드와 상세 화면이 같은 규칙으로 거리를 보여준다. 문구를 각 화면에
//   따로 두면 한쪽만 고쳐져 두 화면이 다른 말을 하게 된다. 특히 안내 문구 같은 사용자 대면
//   문자열은 반드시 한 곳에서만 관리한다.
//
// [백엔드 계약] 서버는 "무슨 거리를 얼마나"라는 사실만 준다.
//   distance        거리(m). 도보거리이거나, 도보 경로를 못 구했으면 직선거리
//   distanceType    "WALKING" | "STRAIGHT"   ← distance가 무슨 거리인지
//   walkingSeconds  도보 시간(초). 도보 경로가 없으면 null
//   그걸 어떤 문장으로 보여줄지는 표현 로직이라 프론트가 정한다.
// ============================================================================

import { formatDistance } from './formatDistance.js';
import { formatWalkingTime } from './formatWalkingTime.js';

// 도보 경로를 구하지 못해 직선거리를 대신 보여줄 때의 안내 문구.
// 이유(도보 정보 없음)와 지금 보이는 값의 정체(직선거리)를 함께 알려준다.
export const STRAIGHT_DISTANCE_NOTE = '도보 정보가 없어 직선거리를 표시했어요';

/**
 * 도보 경로로 잰 거리인지 판단한다.
 *
 * @param {string} distanceType 백엔드 DistanceType enum 이름
 * @returns {boolean} false면 distance가 직선거리라는 뜻
 */
export function isWalkingDistance(distanceType) {
  return distanceType === 'WALKING';
}

/**
 * 거리 정보를 한 줄 문구로 만든다.
 * 도보거리면 "도보 8분 · 470m", 직선거리면 시간 없이 "470m".
 *
 * [왜 직선거리엔 시간이 없나] 직선거리는 실제로 걸어본 경로가 아니라 두 점 사이 최단 거리다.
 *   여기에 도보 시간을 붙이면 실제보다 짧은 시간을 약속하는 셈이 된다.
 *
 * @param {{distance: number, distanceType: string, walkingSeconds: number|null}} distanceInfo
 * @returns {string}
 */
export function toDistanceText({ distance, distanceType, walkingSeconds }) {
  if (isWalkingDistance(distanceType)) {
    return `${formatWalkingTime(walkingSeconds)} · ${formatDistance(distance)}`;
  }

  return formatDistance(distance);
}

/**
 * 거리의 기준점 문구를 만든다. "이태원역 6호선까지"처럼 어디까지의 거리인지 알려준다.
 *
 * [왜 "까지"인가] 사용자는 주차장에 차를 세우고 목적지까지 걷는다. 그래서 출발지가 주차장,
 *   도착지가 목적지다("강남역 도보 5분" 같은 부동산 표기는 역이 출발지라 방향이 반대다).
 *
 * @param {string} placeName 사용자가 고른 목적지 이름. 없으면 일반 문구로 대체한다.
 * @returns {string}
 */
export function toDistanceOriginText(placeName) {
  return placeName ? `${placeName}까지` : '목적지까지';
}
