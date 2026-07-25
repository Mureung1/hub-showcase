// ============================================================================
// api/parkingLots.js — 주차장 관련 API 호출 함수 모음
// ----------------------------------------------------------------------------
// [관심사 분리] "백엔드의 어떤 주소를 어떻게 부르는지"를 이 계층(api/)에 모아둔다.
//   화면·훅은 이 함수 이름만 부르면 되고, HTTP 세부(주소/파라미터)는 몰라도 된다 →
//   백엔드 주소가 바뀌어도 여기만 고치면 됨.
// ============================================================================

import apiClient from './client.js';

/**
 * 목적지 좌표 주변 공영주차장을 거리순으로 조회한다.
 * GET /api/parking-lots?latitude={latitude}&longitude={longitude}
 *
 * [왜 검색어가 아니라 좌표인가] 예전엔 목적지 문자열을 넘기면 서버가 카카오 검색 1위를
 *   조용히 골랐다. 이제 사용자가 /places 화면에서 목적지를 확정하고, 그 장소의 좌표를
 *   URL에 담아 여기까지 전달한다. 어느 지점 기준인지가 명확해진다.
 *
 * [async/await] 서버 응답은 시간이 걸리는 "비동기" 작업이다. await는 "응답이 올 때까지
 *   이 함수를 잠시 멈췄다가" 결과가 오면 다음 줄로 진행한다(그동안 브라우저 화면은 안 멈춤).
 *   async 함수는 항상 Promise(미래의 값)를 반환한다.
 *
 * @param {{latitude: string|number, longitude: string|number}} destination 목적지 좌표
 * @returns {Promise<Array<{id:number, name:string, address:string, distance:number, payType:'PAID'|'FREE'}>>}
 *          거리순 정렬된 주차장 목록(최대 10개). 주변에 없으면 빈 배열.
 */
export async function searchParkingLots({ latitude, longitude }) {
  // axios 응답 객체는 { data, status, headers, ... } 구조. 실제 본문은 data에 있어
  // 구조분해 { data } 로 꺼낸다.
  const { data } = await apiClient.get('/parking-lots', {
    params: { latitude, longitude }, // → ?latitude=37.53&longitude=126.99 로 자동 변환
  });
  return data; // 주차장 배열을 그대로 반환
}

/**
 * id로 주차장 하나의 상세 정보를 조회한다.
 * GET /api/parking-lots/{id}
 *
 * @param {number|string} id 주차장 id (URL의 :id)
 * @returns {Promise<{id:number, name:string, address:string, tel:string,
 *   parkingKind:string, operType:string, totalSlots:number, payType:string,
 *   fee:object, operatingHours:object}>} 주차장 상세 1건
 */
export async function getParkingLot(id) {
  // 템플릿 리터럴로 경로에 id를 끼워 넣는다 → GET /api/parking-lots/416
  const { data } = await apiClient.get(`/parking-lots/${id}`);
  return data;
}
