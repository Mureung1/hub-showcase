import { useEffect, useState } from "react";

import { loadApiReadiness } from "../../services/system";

export type ApiReadinessState = "checking" | "waking" | "ready" | "unavailable";

const WAKE_NOTICE_DELAY_MS = 1_200;
const READY_REQUEST_TIMEOUT_MS = 75_000;

export function useApiReadiness(enabled = true) {
  const [state, setState] = useState<ApiReadinessState>(enabled ? "checking" : "ready");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState("ready");
      return;
    }

    const controller = new AbortController();
    let disposed = false;
    setState("checking");
    const wakingTimer = window.setTimeout(() => setState("waking"), WAKE_NOTICE_DELAY_MS);
    const timeoutTimer = window.setTimeout(() => controller.abort(), READY_REQUEST_TIMEOUT_MS);

    void loadApiReadiness(controller.signal)
      .then(() => {
        if (!disposed) setState("ready");
      })
      .catch(() => {
        if (!disposed) setState("unavailable");
      })
      .finally(() => {
        window.clearTimeout(wakingTimer);
        window.clearTimeout(timeoutTimer);
      });

    return () => {
      disposed = true;
      window.clearTimeout(wakingTimer);
      window.clearTimeout(timeoutTimer);
      controller.abort();
    };
  }, [enabled, retryToken]);

  return {
    state,
    retry: () => setRetryToken((current) => current + 1),
  };
}
