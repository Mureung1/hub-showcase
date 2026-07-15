import { useEffect, useRef, useState } from "react";

import { loadMarketSearch, type MarketSearchResult } from "./searchApi";

export type MarketSearchState = "idle" | "input-error" | "loading" | "ready" | "error";

export function useMarketSearch() {
  const [state, setState] = useState<MarketSearchState>("idle");
  const [results, setResults] = useState<MarketSearchResult[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function search(value: string) {
    const query = value.trim();
    if (!query) {
      setResults([]);
      setState("input-error");
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setResults([]);
    setState("loading");
    try {
      const response = await loadMarketSearch(query, controller.signal);
      if (controller.signal.aborted) return;
      setResults(response.results);
      setState("ready");
    } catch {
      if (controller.signal.aborted) return;
      setResults([]);
      setState("error");
    }
  }

  function clear() {
    controllerRef.current?.abort();
    setResults([]);
    setState("idle");
  }

  return { state, results, search, clear };
}
