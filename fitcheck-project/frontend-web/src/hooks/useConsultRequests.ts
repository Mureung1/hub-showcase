import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  countPendingConsultRequests,
  loadConsultRequests,
  markAllConsultRequestsRead,
  markConsultRequestRead,
  subscribeConsultSync,
} from '../data/consultStorage';
import type { ConsultRequest } from '../types/consult';

export function useConsultRequests() {
  const [requests, setRequests] = useState<ConsultRequest[]>(loadConsultRequests);

  const refresh = useCallback(() => {
    setRequests(loadConsultRequests());
  }, []);

  useEffect(() => {
    return subscribeConsultSync(() => {
      refresh();
    });
  }, [refresh]);

  const pendingCount = useMemo(
    () => countPendingConsultRequests(requests),
    [requests],
  );

  const markRead = useCallback((id: string) => {
    setRequests(markConsultRequestRead(id));
  }, []);

  const markAllRead = useCallback(() => {
    setRequests(markAllConsultRequestsRead());
  }, []);

  return {
    requests,
    pendingCount,
    markRead,
    markAllRead,
    refresh,
  };
}
