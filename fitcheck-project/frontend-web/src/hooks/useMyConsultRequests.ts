import { useCallback, useEffect, useState } from 'react';
import { fetchMyConsultRequests } from '../services/consultRequestsApi';
import { getAccessToken } from '../services/authToken';
import type { ConsultRequest } from '../types/consult';

/** Member-facing consult list from API (GET /consult-requests/me). */
export function useMyConsultRequests() {
  const [requests, setRequests] = useState<ConsultRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { requests: fetched } = await fetchMyConsultRequests({ limit: 50 });
      setRequests(fetched);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { requests, loading, refresh };
}
