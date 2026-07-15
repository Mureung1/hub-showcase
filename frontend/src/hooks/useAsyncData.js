import { useEffect, useRef, useState } from 'react';

// 여러 화면(장보기 세트/리스트 등)이 fetch 상태를 다루는 방식을 통일하는 훅.
// status를 loading/ready/error 3단계로 분리해서, fetch가 끝나기 전엔 "결과 없음" 문구가
// 잘못 뜨지 않게 하고, 필터/인분 배수를 빠르게 바꿀 때 먼저 시작한 느린 응답이 나중 응답을
// 덮어쓰지 않도록(stale 응답 무시) 막는다. refetch()로 강제 재시도도 가능하다.
export function useAsyncData(fetcher, deps) {
  const [reloadTick, setReloadTick] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const myId = ++requestIdRef.current;
    setState((prev) => ({ status: 'loading', data: prev.data, error: null }));
    fetcher()
      .then((data) => {
        if (requestIdRef.current !== myId) return; // 이 요청이 끝나기 전에 새 요청이 시작됐으면 무시
        setState({ status: 'ready', data, error: null });
      })
      .catch((err) => {
        if (requestIdRef.current !== myId) return;
        setState({ status: 'error', data: null, error: err?.message || '불러오는 중 문제가 발생했어요' });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick]);

  return { ...state, refetch: () => setReloadTick((t) => t + 1) };
}
