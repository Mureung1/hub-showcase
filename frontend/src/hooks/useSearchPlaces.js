// ============================================================================
// hooks/useSearchPlaces.js — 장소 후보를 가져오는 커스텀 훅
// ----------------------------------------------------------------------------
// useSearchParkingLots.js 와 같은 구조다. 차이는 딱 하나 — 재시도 정책(아래 설명).
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { searchPlaces } from '../api/places.js';

/**
 * 키워드로 목적지 후보를 검색하는 react-query 훅.
 * - keyword가 비어 있으면 요청하지 않는다(enabled).
 */
export function useSearchPlaces(keyword) {
  return useQuery({
    // queryKey: 캐시 이름표. 키워드가 바뀌면 새 요청, 같으면 캐시 재사용.
    //   덕분에 후보를 고르고 뒤로 돌아오면 재요청 없이 목록이 즉시 뜬다.
    queryKey: ['places', keyword],
    queryFn: () => searchPlaces(keyword),
    enabled: Boolean(keyword),
    // retry: 일시적 오류만 1번 더 시도.
    //   [주차장 검색과 다른 점] 그쪽은 404(장소 못 찾음)를 걸러내는 함수형 retry를 쓴다.
    //   이 API는 결과가 없어도 빈 배열 200을 주므로 404가 아예 없다 → 단순히 1로 충분.
    retry: 1,
  });
}
