// #24 — 화면(Input -> Processing -> Result)이 바뀌어도 값이 남아있게 하는 공용 보관함.
// Routes 바깥에 놓이므로 주소가 바뀌어도 사라지지 않는다.
// 이번 계산 1회분만 메모리에 들고 있고, 새로고침하면 비워진다.
// (기록 보기용 영구 저장은 #19에서 localStorage로 따로 처리 — 2026-07-21 결정)
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
  ScheduleCalculateRequest,
  ScheduleCalculateResponse,
} from '../api/calculateSchedule';

/** 계산이 지금 어느 단계인지 */
export type ScheduleStatus = 'idle' | 'loading' | 'success' | 'error';

interface ScheduleContextValue {
  /** InputPage가 채우는 요청 내용 */
  request: ScheduleCalculateRequest | null;
  /** 서버가 돌려준 계산 결과 */
  response: ScheduleCalculateResponse | null;
  status: ScheduleStatus;
  /** status가 'error'일 때 화면에 띄울 문구 */
  errorMessage: string | null;

  setRequest: (request: ScheduleCalculateRequest) => void;
  setResponse: (response: ScheduleCalculateResponse) => void;
  setStatus: (status: ScheduleStatus) => void;
  setErrorMessage: (message: string | null) => void;
  /** 처음 상태로 되돌린다(다시 계산하기 등) */
  reset: () => void;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ScheduleCalculateRequest | null>(null);
  const [response, setResponse] = useState<ScheduleCalculateResponse | null>(null);
  const [status, setStatus] = useState<ScheduleStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reset() {
    setRequest(null);
    setResponse(null);
    setStatus('idle');
    setErrorMessage(null);
  }

  // 값이 실제로 바뀔 때만 새 묶음을 만든다(안 그러면 화면이 매번 다시 그려진다)
  const value = useMemo<ScheduleContextValue>(
    () => ({
      request,
      response,
      status,
      errorMessage,
      setRequest,
      setResponse,
      setStatus,
      setErrorMessage,
      reset,
    }),
    [request, response, status, errorMessage],
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

/** 어느 화면에서든 이 한 줄로 보관함을 꺼내 쓴다. */
export function useSchedule(): ScheduleContextValue {
  const value = useContext(ScheduleContext);
  if (value === null) {
    // ScheduleProvider로 감싸지 않은 곳에서 부르면 여기서 걸린다(main.tsx 확인)
    throw new Error('useSchedule은 ScheduleProvider 안에서만 쓸 수 있습니다.');
  }
  return value;
}
