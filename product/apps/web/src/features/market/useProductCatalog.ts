import { useEffect, useState } from "react";

import { loadProductCatalog, type ProductCatalog } from "../../services/productCatalog";

export type ProductCatalogState = "loading" | "ready" | "error";
export type ProductCatalogRemoteState = "idle" | "loading" | "ready" | "error";

export function useProductCatalog(initialCatalog?: ProductCatalog, loadRemote = true) {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(initialCatalog ?? null);
  const [state, setState] = useState<ProductCatalogState>(initialCatalog ? "ready" : "loading");
  const [remoteState, setRemoteState] = useState<ProductCatalogRemoteState>(
    loadRemote ? "loading" : "idle",
  );
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (!loadRemote) {
      setCatalog(initialCatalog ?? null);
      setState(initialCatalog ? "ready" : "error");
      setRemoteState("idle");
      return () => controller.abort();
    }
    if (initialCatalog) {
      setCatalog(initialCatalog);
      setState("ready");
    } else {
      setCatalog(null);
      setState("loading");
    }
    setRemoteState("loading");
    void loadProductCatalog(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setCatalog(result);
        setState("ready");
        setRemoteState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!initialCatalog) setState("error");
        setRemoteState("error");
      });
    return () => controller.abort();
  }, [initialCatalog, loadRemote, retryToken]);

  return {
    catalog,
    state,
    remoteState,
    retry: () => setRetryToken((current) => current + 1),
  };
}
