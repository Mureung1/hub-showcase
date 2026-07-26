import { useEffect, useRef, useState } from "react";

import { loadApiReadiness } from "../../services/system";

export type ApiReadinessState = "checking" | "waking" | "ready" | "unavailable";

const WAKE_NOTICE_DELAY_MS = 1_200;
const READY_REQUEST_TIMEOUT_MS = 75_000;
const AUTO_RETRY_DELAY_MS = 8_000;
const MAX_AUTO_RETRIES = 8;

export function useApiReadiness(enabled = true) {
  const [state, setState] = useState<ApiReadinessState>(enabled ? "checking" : "ready");
  const [retryToken, setRetryToken] = useState(0);
  const automaticRetries = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setState("ready");
      return;
    }

    const controller = new AbortController();
    let disposed = false;
    let retryTimer: number | undefined;
    setState("checking");
    const wakingTimer = window.setTimeout(() => setState("waking"), WAKE_NOTICE_DELAY_MS);
    const timeoutTimer = window.setTimeout(() => controller.abort(), READY_REQUEST_TIMEOUT_MS);

    void loadApiReadiness(controller.signal)
      .then(() => {
        if (!disposed) {
          automaticRetries.current = 0;
          setState("ready");
        }
      })
      .catch(() => {
        if (disposed) return;
        if (automaticRetries.current >= MAX_AUTO_RETRIES) {
          setState("unavailable");
          return;
        }
        automaticRetries.current += 1;
        setState("waking");
        retryTimer = window.setTimeout(
          () => setRetryToken((current) => current + 1),
          AUTO_RETRY_DELAY_MS,
        );
      })
      .finally(() => {
        window.clearTimeout(wakingTimer);
        window.clearTimeout(timeoutTimer);
      });

    return () => {
      disposed = true;
      window.clearTimeout(wakingTimer);
      window.clearTimeout(timeoutTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      controller.abort();
    };
  }, [enabled, retryToken]);

  return {
    state,
    retry: () => {
      automaticRetries.current = 0;
      setRetryToken((current) => current + 1);
    },
  };
}
