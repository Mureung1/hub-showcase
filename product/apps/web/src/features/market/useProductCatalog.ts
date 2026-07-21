import { useEffect, useState } from "react";

import { loadProductCatalog, type ProductCatalog } from "../../services/productCatalog";

export type ProductCatalogState = "loading" | "ready" | "error";

export function useProductCatalog(fallbackCatalog?: ProductCatalog) {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [state, setState] = useState<ProductCatalogState>("loading");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCatalog(null);
    setState("loading");
    if (fallbackCatalog) {
      setCatalog(fallbackCatalog);
      setState("ready");
      return () => controller.abort();
    }
    void loadProductCatalog(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setCatalog(result);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [fallbackCatalog, retryToken]);

  return {
    catalog,
    state,
    retry: () => setRetryToken((current) => current + 1),
  };
}
