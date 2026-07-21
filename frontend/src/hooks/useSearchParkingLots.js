// ============================================================================
// hooks/useSearchParkingLots.js — 검색 데이터를 가져오는 "커스텀 훅"
// ----------------------------------------------------------------------------
// [훅(Hook)] 이름이 use~ 로 시작하는 특별한 함수로 컴포넌트에 "기능"을 붙인다
//   (useState=상태, useQuery=서버데이터). 규칙: 컴포넌트/다른 훅의 최상단에서만 호출.
//   여러 곳에서 쓸 로직은 이렇게 커스텀 훅으로 뽑아 재사용한다(여기선 "주차장 검색").
// [선언적 데이터 패칭] 예전엔 useEffect로 "마운트되면 fetch, 로딩 켜고, 성공하면 setData,
//   실패하면 setError..."를 손으로 다 짰다. react-query는 "무엇을 원하는지(queryKey+queryFn)"
//   만 선언하면 언제/어떻게(로딩·캐시·재시도·중복요청 합치기)를 대신 처리한다.
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { searchParkingLots } from '../api/parkingLots.js';

/**
 * 목적지 주변 주차장 검색을 위한 react-query 훅.
 * - destination 이 비어 있으면 요청하지 않는다(enabled).
 * - 404(NOT_FOUND_DESTINATION)는 재시도하지 않는다.
 */
export function useSearchParkingLots(destination) {
  return useQuery({
    // queryKey: 이 데이터의 고유 "이름표"(캐시 키). destination이 바뀌면 다른 데이터로 보고
    //   새로 요청하고, 같은 key면 캐시된 결과를 즉시 재사용한다.
    queryKey: ['parkingLots', destination],
    // queryFn: 실제로 데이터를 가져오는 비동기 함수(우리 API 호출).
    queryFn: () => searchParkingLots(destination),
    // enabled: false면 요청을 아예 안 함. 빈 목적지엔 굳이 서버를 부르지 않는다.
    enabled: Boolean(destination),
    // retry: 실패 시 재시도 정책(함수로 세밀 제어). 404(장소 못 찾음)는 다시 해도 같으니
    //   재시도 X, 그 외(일시적 오류)는 1번만.
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false; // ?. = 앞이 없으면 에러 없이 undefined
      return failureCount < 1;
    },
  });
}
