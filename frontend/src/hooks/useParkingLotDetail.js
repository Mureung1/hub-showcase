// ============================================================================
// hooks/useParkingLotDetail.js — 주차장 상세를 가져오는 커스텀 훅
// ----------------------------------------------------------------------------
// 검색 훅(useSearchParkingLots)과 완전히 같은 패턴. useQuery로 "상세 조회"를 선언적으로
// 처리한다. (훅/useQuery 개념 설명은 useSearchParkingLots.js 주석 참고 — 여긴 요청만 다름)
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { getParkingLot } from '../api/parkingLots.js';

/**
 * id로 주차장 상세를 조회하는 react-query 훅.
 * - id가 없으면 요청하지 않는다(enabled).
 * - 404(없는 주차장)는 재시도하지 않는다.
 *
 * @param {string} id 주차장 id
 * @param {{latitude?: string, longitude?: string}} [destination] 목적지 좌표(선택).
 *   있으면 응답에 도보거리(distanceInfo)가 함께 온다.
 */
export function useParkingLotDetail(id, { latitude, longitude } = {}) {
  return useQuery({
    // [queryKey = 캐시의 주소] 이 배열이 다르면 react-query는 "다른 요청"으로 보고 따로 캐시한다.
    //   좌표를 키에 넣는 이유: 같은 주차장이라도 목적지가 다르면 도보거리가 달라진다.
    //   빠뜨리면 이태원역 기준으로 본 뒤 강남역 기준으로 들어와도 예전 거리가 그대로 보인다.
    // [문자열 그대로 쓴다] URL에서 읽은 값을 Number로 바꾸지 않는다. 같은 좌표가 어떤 곳에선
    //   문자열, 어떤 곳에선 숫자로 섞이면 키가 달라져 캐시가 조용히 빗나간다.
    queryKey: ['parkingLot', id, latitude, longitude],
    queryFn: () => getParkingLot(id, { latitude, longitude }),
    enabled: Boolean(id),
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false; // 없는 주차장은 재시도 무의미
      return failureCount < 1;
    },
  });
}
