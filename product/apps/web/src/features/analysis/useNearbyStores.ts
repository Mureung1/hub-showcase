import { useEffect, useState } from "react";

import { loadNearbyStores, NearbyApiError, type NearbyRequest } from "./nearbyApi";
import type { NearbyStoreResponse } from "./types";

export type NearbyStoreState = "loading" | "ready" | "empty" | "unsupported" | "error";

export function useNearbyStores(request: NearbyRequest, enabled = true) {
  const [retryToken, setRetryToken] = useState(0);
  const [longitude, latitude] = request.center;
  const { category, marketId, radius, scope } = request;
  const requestKey = [longitude, latitude, radius, category, scope, marketId].join(":");
  const [result, setResult] = useState<{
    requestKey: string | null;
    state: NearbyStoreState;
    data: NearbyStoreResponse | null;
  }>({ requestKey: null, state: "loading", data: null });

  useEffect(() => {
    if (!enabled) {
      setResult({ requestKey, state: "loading", data: null });
      return;
    }
    const controller = new AbortController();
    setResult({ requestKey, state: "loading", data: null });
    void loadNearbyStores(
      { center: [longitude, latitude], radius, category, scope, marketId },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult({
          requestKey,
          state: response.total_count === 0 ? "empty" : "ready",
          data: response,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          requestKey,
          state: error instanceof NearbyApiError && error.status === 422 ? "unsupported" : "error",
          data: null,
        });
      });
    return () => controller.abort();
  }, [category, enabled, marketId, radius, requestKey, retryToken, scope, latitude, longitude]);

  const isCurrentRequest = result.requestKey === requestKey;

  return {
    state: isCurrentRequest ? result.state : "loading",
    data: isCurrentRequest ? result.data : null,
    retry: () => setRetryToken((current) => current + 1),
  };
}
