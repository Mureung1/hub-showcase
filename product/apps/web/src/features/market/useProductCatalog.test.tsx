import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProductCatalog } from "../../services/productCatalog";
import { useProductCatalog } from "./useProductCatalog";

const bootstrapCatalog: ProductCatalog = {
  markets: [
    {
      key: "연남",
      market_id: "bootstrap-market",
      name: "연남동 골목상권",
      address: "마포구",
      center: [126.92, 37.56],
    },
  ],
  categories: [{ name: "카페", codes: ["CS100010"] }],
  radii: [300],
};

afterEach(() => vi.unstubAllGlobals());

describe("useProductCatalog", () => {
  it("renders the bootstrap catalog without waiting for a sleeping API", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );

    const { result } = renderHook(() => useProductCatalog(bootstrapCatalog));

    expect(result.current.state).toBe("ready");
    expect(result.current.catalog).toBe(bootstrapCatalog);
  });

  it("replaces the bootstrap snapshot with the authoritative API catalog", async () => {
    const remoteCatalog: ProductCatalog = {
      ...bootstrapCatalog,
      markets: [{ ...bootstrapCatalog.markets[0], market_id: "remote-market" }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => remoteCatalog }),
    );

    const { result } = renderHook(() => useProductCatalog(bootstrapCatalog));

    await waitFor(() => expect(result.current.catalog).toEqual(remoteCatalog));
    expect(result.current.state).toBe("ready");
  });

  it("keeps the usable bootstrap catalog when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { result } = renderHook(() => useProductCatalog(bootstrapCatalog));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current.state).toBe("ready");
    expect(result.current.catalog).toBe(bootstrapCatalog);
  });
});
