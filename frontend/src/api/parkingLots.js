// ============================================================================
// api/parkingLots.js — 주차장 관련 API 호출 함수 모음
// ----------------------------------------------------------------------------
// [관심사 분리] "백엔드의 어떤 주소를 어떻게 부르는지"를 이 계층(api/)에 모아둔다.
//   화면·훅은 이 함수 이름만 부르면 되고, HTTP 세부(주소/파라미터)는 몰라도 된다 →
//   백엔드 주소가 바뀌어도 여기만 고치면 됨.
// ============================================================================

import apiClient from './client.js';

/**
 * 목적지 주변 공영주차장을 거리순으로 조회한다.
 * GET /api/parking-lots?destination={destination}
 *
 * [async/await] 서버 응답은 시간이 걸리는 "비동기" 작업이다. await는 "응답이 올 때까지
 *   이 함수를 잠시 멈췄다가" 결과가 오면 다음 줄로 진행한다(그동안 브라우저 화면은 안 멈춤).
 *   async 함수는 항상 Promise(미래의 값)를 반환한다.
 *
 * @param {string} destination 검색할 목적지
 * @returns {Promise<Array<{id:number, name:string, address:string, distance:number, payType:'PAID'|'FREE'}>>}
 *          거리순 정렬된 주차장 목록(최대 10개)
 */
export async function searchParkingLots(destination) {
  // axios 응답 객체는 { data, status, headers, ... } 구조. 실제 본문은 data에 있어
  // 구조분해 { data } 로 꺼낸다.
  const { data } = await apiClient.get('/parking-lots', {
    params: { destination }, // 객체 → ?destination=강남역 쿼리스트링으로 axios가 자동 변환
  });
  return data; // 주차장 배열을 그대로 반환
}
