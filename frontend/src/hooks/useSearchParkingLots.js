import { useQuery } from '@tanstack/react-query';
import { searchParkingLots } from '../api/parkingLots.js';

/**
 * 목적지 주변 주차장 검색을 위한 react-query 훅.
 * - destination 이 비어 있으면 요청하지 않는다(enabled).
 * - 404(NOT_FOUND_DESTINATION)는 재시도하지 않는다.
 */
export function useSearchParkingLots(destination) {
  return useQuery({
    queryKey: ['parkingLots', destination],
    queryFn: () => searchParkingLots(destination),
    enabled: Boolean(destination),
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 1;
    },
  });
}
