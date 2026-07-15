import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  countPendingConsultRequests,
  loadConsultRequests,
  markAllConsultRequestsRead,
  markConsultRequestRead,
  saveConsultReport,
  subscribeConsultSync,
} from '../data/consultStorage';
import type { ConsultReportInput, ConsultRequest } from '../types/consult';

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

  const saveReport = useCallback((id: string, input: ConsultReportInput) => {
    setRequests(saveConsultReport(id, input));
  }, []);

  return {
    requests,
    pendingCount,
    markRead,
    markAllRead,
    saveReport,
    refresh,
  };
}
