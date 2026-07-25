// ============================================================================
// api/places.js — 장소(목적지 후보) 검색 API 호출
// ----------------------------------------------------------------------------
// [리소스별 파일 분리] api/ 계층은 "백엔드 리소스 하나당 파일 하나"로 나눈다.
//   주차장 호출은 parkingLots.js, 장소 호출은 이 파일.
//   화면·훅은 함수 이름만 부르고, HTTP 세부(주소·파라미터)는 여기만 안다.
//
// [이 API가 왜 필요한가] 예전에는 "이태원 맛집"을 검색하면 서버가 카카오 검색 1위를
//   조용히 골라 그 근처 주차장을 보여줬다. 사용자는 어느 장소 기준인지 알 수 없었다.
//   이제 후보 목록을 먼저 받아 사용자가 직접 목적지를 고른다.
// ============================================================================

import apiClient from './client.js';

/**
 * 키워드로 목적지 후보 장소를 조회한다.
 * GET /api/places?keyword={keyword}
 *
 * [서버 계약] 검색 결과가 없어도 404가 아니라 **빈 배열 + 200**이 온다.
 *   "결과 없음"은 오류가 아니라 정상 응답이기 때문. 그래서 호출부는 에러 분기 없이
 *   length === 0 만 보면 된다(주차장 검색의 404 처리와 다른 점).
 *
 * @param {string} keyword 사용자가 입력한 검색어 (예: "이태원역")
 * @returns {Promise<Array<{name: string, address: string|null,
 *   coordinates: {latitude: number, longitude: number}}>>} 장소 후보 목록(최대 10개)
 *   address는 카카오에 주소가 없는 장소일 경우 null 일 수 있다.
 */
export async function searchPlaces(keyword) {
  const { data } = await apiClient.get('/places', {
    params: { keyword }, // 객체 → ?keyword=이태원역 으로 axios가 자동 변환(한글 인코딩 포함)
  });
  return data;
}
