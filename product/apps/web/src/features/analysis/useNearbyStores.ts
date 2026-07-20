import { useEffect, useState } from "react";

import { loadNearbyStores, NearbyApiError, type NearbyRequest } from "./nearbyApi";
import type { NearbyStoreResponse } from "./types";

export type NearbyStoreState = "loading" | "ready" | "empty" | "unsupported" | "error";

export function useNearbyStores(request: NearbyRequest) {
  const [state, setState] = useState<NearbyStoreState>("loading");
  const [data, setData] = useState<NearbyStoreResponse | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [longitude, latitude] = request.center;
  const { category, radius } = request;

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setState("loading");
    void loadNearbyStores({ center: [longitude, latitude], radius, category }, controller.signal)
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
  }, [category, radius, latitude, longitude, retryToken]);

  return {
    state,
    data,
    retry: () => setRetryToken((current) => current + 1),
  };
}
