import { afterEach, describe, expect, it, vi } from "vitest";

import { loadApiReadiness } from "./system";

describe("system service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts the ready API contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadApiReadiness(new AbortController().signal)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/ready"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects a service that is not ready", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(loadApiReadiness(new AbortController().signal)).rejects.toThrow(
      "API readiness 503",
    );
  });
});
