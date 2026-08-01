import { useEffect, useRef, useState } from "react";

import { loadNearbyStores, NearbyApiError, type NearbyRequest } from "./nearbyApi";
import type { NearbyStoreResponse } from "./types";

export type NearbyStoreState = "loading" | "ready" | "empty" | "unsupported" | "error";

export function useNearbyStores(request: NearbyRequest, enabled = true) {
  const [retryToken, setRetryToken] = useState(0);
  const responseCache = useRef(new Map<string, NearbyStoreResponse>());
  const [longitude, latitude] = request.center;
  const { category, marketId, radius, scope, taxonomyNodeId } = request;
  const requestKey = [longitude, latitude, radius, category, scope, marketId, taxonomyNodeId].join(":");
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
    const cached = responseCache.current.get(requestKey);
    if (cached) {
      setResult({
        requestKey,
        state: cached.total_count === 0 ? "empty" : "ready",
        data: cached,
      });
      return;
    }
    const controller = new AbortController();
    setResult((current) => ({ requestKey, state: "loading", data: current.data }));
    void loadNearbyStores(
      { center: [longitude, latitude], radius, category, scope, marketId, taxonomyNodeId },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        responseCache.current.set(requestKey, response);
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
  }, [category, enabled, marketId, radius, requestKey, retryToken, scope, latitude, longitude, taxonomyNodeId]);

  const isCurrentRequest = result.requestKey === requestKey;
  const isStale =
    !isCurrentRequest ||
    Boolean(
      result.data && result.data.category_coverage.requested_category !== category,
    );

  return {
    state: isCurrentRequest ? result.state : "loading",
    data: result.data,
    isStale,
    retry: () => setRetryToken((current) => current + 1),
  };
}
