import { useEffect, useState } from "react";

import { loadNearbyStores, NearbyApiError, type NearbyRequest } from "./nearbyApi";
import type { NearbyStoreResponse } from "./types";

export type NearbyStoreState = "loading" | "ready" | "empty" | "unsupported" | "error";

export function useNearbyStores(request: NearbyRequest, enabled = true) {
  const [state, setState] = useState<NearbyStoreState>("loading");
  const [data, setData] = useState<NearbyStoreResponse | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [longitude, latitude] = request.center;
  const { category, marketId, radius, scope } = request;

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setState("loading");
      return;
    }
    const controller = new AbortController();
    setData(null);
    setState("loading");
    void loadNearbyStores(
      { center: [longitude, latitude], radius, category, scope, marketId },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        setData(response);
        setState(response.total_count === 0 ? "empty" : "ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setState(error instanceof NearbyApiError && error.status === 422 ? "unsupported" : "error");
      });
    return () => controller.abort();
  }, [category, enabled, marketId, radius, scope, latitude, longitude, retryToken]);

  return {
    state,
    data,
    retry: () => setRetryToken((current) => current + 1),
  };
}
