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
 */
export function useParkingLotDetail(id) {
  return useQuery({
    // queryKey에 id를 넣어, id가 바뀌면 다른 주차장으로 보고 새로 요청·캐시한다.
    queryKey: ['parkingLot', id],
    queryFn: () => getParkingLot(id),
    enabled: Boolean(id),
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false; // 없는 주차장은 재시도 무의미
      return failureCount < 1;
    },
  });
}
