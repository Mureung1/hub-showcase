import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";

export function useApiResource(path) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setIsLoading(true);
        setError(null);
        return apiClient.get(path);
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  return { data, isLoading, error, refetch };
}
