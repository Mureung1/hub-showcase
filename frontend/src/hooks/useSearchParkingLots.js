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
 * 목적지 좌표 주변 주차장 검색을 위한 react-query 훅.
 * - 좌표가 없으면 요청하지 않는다(enabled).
 *
 * @param {{latitude: string|null, longitude: string|null}} destination URL에서 읽은 목적지 좌표
 */
export function useSearchParkingLots({ latitude, longitude }) {
  return useQuery({
    // queryKey: 이 데이터의 고유 "이름표"(캐시 키). 좌표가 바뀌면 다른 데이터로 보고
    //   새로 요청하고, 같은 좌표면 캐시된 결과를 즉시 재사용한다.
    //   [주의] 좌표는 URL에서 읽은 "문자열"을 그대로 쓴다. 어딘가에서 숫자로 바꿔 섞으면
    //   같은 위치인데도 키가 달라져(예: '37.5' vs 37.5) 캐시가 조용히 빗나간다.
    queryKey: ['parkingLots', latitude, longitude],
    // queryFn: 실제로 데이터를 가져오는 비동기 함수(우리 API 호출).
    queryFn: () => searchParkingLots({ latitude, longitude }),
    // enabled: false면 요청을 아예 안 함. 좌표 없이 /results로 들어온 경우 서버를 부르지 않는다.
    enabled: Boolean(latitude && longitude),
    // retry: 일시적 오류만 1번 더 시도.
    //   예전에는 "장소 못 찾음 404"를 걸러내는 함수형 retry였는데, 목적지 확정이 /places로
    //   옮겨가면서 이 API에는 404가 없어졌다(주변에 주차장이 없으면 빈 배열 200).
    retry: 1,
  });
}
