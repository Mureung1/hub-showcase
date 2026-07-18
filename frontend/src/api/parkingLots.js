import apiClient from './client.js';

/**
 * 목적지 주변 공영주차장을 거리순으로 조회한다.
 * GET /api/parking-lots?destination={destination}
 *
 * @param {string} destination 검색할 목적지
 * @returns {Promise<Array<{id:number, name:string, address:string, distance:number, payType:'PAID'|'FREE'}>>}
 *          거리순 정렬된 주차장 목록(최대 10개)
 */
export async function searchParkingLots(destination) {
  const { data } = await apiClient.get('/parking-lots', {
    params: { destination },
  });
  return data;
}
