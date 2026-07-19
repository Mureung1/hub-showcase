import { afterEach, describe, expect, it, vi } from "vitest";

import { loadProductCatalog } from "./productCatalog";

describe("product catalog service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads the versioned product support contract", async () => {
    const payload = {
      markets: [
        {
          key: "연남",
          market_id: "market-1",
          name: "연남동 골목상권",
          address: "마포구",
          center: [126.92, 37.56],
        },
      ],
      categories: [{ name: "카페", codes: ["CS100010"] }],
      radii: [100, 300, 500],
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadProductCatalog(new AbortController().signal)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/catalog"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("does not hide an unavailable catalog as an empty catalog", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(loadProductCatalog(new AbortController().signal)).rejects.toThrow("API 503");
  });
});
