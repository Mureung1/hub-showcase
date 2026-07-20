import { useEffect, useState } from "react";

import { loadProductCatalog, type ProductCatalog } from "../../services/productCatalog";

export type ProductCatalogState = "loading" | "ready" | "error";

export function useProductCatalog() {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [state, setState] = useState<ProductCatalogState>("loading");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCatalog(null);
    setState("loading");
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
  }, [retryToken]);

  return {
    catalog,
    state,
    retry: () => setRetryToken((current) => current + 1),
  };
}
