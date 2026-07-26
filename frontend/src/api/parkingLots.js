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
 * GET /api/parking-lots/{id}?latitude={latitude}&longitude={longitude}
 *
 * [경로와 쿼리의 역할이 다르다]
 *   경로의 id  → "어느 주차장인가"를 식별한다. 없으면 조회 자체가 불가능하다.
 *   쿼리의 좌표 → "어느 목적지 기준으로 볼 것인가"라는 문맥이다. 선택 값이다.
 *
 * [좌표가 선택인 이유] 요금·운영시간·실시간 대수는 목적지와 무관한 사실이라 언제나 나온다.
 *   반면 도보거리는 "주차장 ↔ 목적지" 관계라 목적지가 없으면 값 자체가 성립하지 않는다.
 *   그래서 좌표 없이 부르면 서버가 distanceInfo만 null로 주고 나머지는 정상 응답한다.
 *   (상세 주소로 바로 들어오거나 링크가 잘린 경우에도 화면이 깨지지 않는다)
 *
 * @param {number|string} id 주차장 id (URL의 :id)
 * @param {{latitude?: string|number, longitude?: string|number}} [destination] 목적지 좌표.
 *   생략하거나 값이 없으면 axios가 해당 쿼리를 아예 붙이지 않는다.
 * @returns {Promise<{id:number, name:string, address:string, tel:string,
 *   parkingKind:string, operType:string, totalSlots:number, payType:string,
 *   fee:object, operatingHours:object, realtimeInfo:object|null,
 *   distanceInfo:{distance:number, distanceType:'WALKING'|'STRAIGHT',
 *                 walkingSeconds:number|null}|null}>} 주차장 상세 1건
 */
export async function getParkingLot(id, { latitude, longitude } = {}) {
  // 템플릿 리터럴로 경로에 id를 끼워 넣는다 → GET /api/parking-lots/416
  const { data } = await apiClient.get(`/parking-lots/${id}`, {
    // axios는 값이 undefined·null인 파라미터를 쿼리에서 빼준다.
    // 좌표가 없으면 자연히 GET /api/parking-lots/416 이 되어 "목적지 없는 조회"가 된다.
    params: { latitude, longitude },
  });
  return data;
}
