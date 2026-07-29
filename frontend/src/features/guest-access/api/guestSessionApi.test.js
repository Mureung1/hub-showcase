import { describe, expect, it, vi } from "vitest";
import { createGuestSessionApi } from "./guestSessionApi";

function response(data) {
  return {
    ok: true,
    json: vi.fn(async () => ({ success: true, data }))
  };
}

describe("guest session API client", () => {
  it("creates a guest without sending an existing key", async () => {
    const fetchImpl = vi.fn(async () =>
      response({ recoveryKey: "NEW-KEY" })
    );
    const api = createGuestSessionApi({
      baseUrl: "https://api.example.com/",
      fetchImpl
    });

    await api.create();

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/api/guest-sessions",
      { method: "POST", cache: "no-store" }
    );
  });

  it("sends a recovery key only in the protected header", async () => {
    const fetchImpl = vi.fn(async () => response({ guestSession: {} }));
    const api = createGuestSessionApi({
      baseUrl: "https://api.example.com",
      fetchImpl
    });
    const key = "ABCD-EFGH-JKMN-PQRT-VWXY-Z012-3456-789A";

    await api.recover(key);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/api/guest-sessions/recover",
      {
        method: "POST",
        headers: { "X-Guest-Key": key },
        cache: "no-store"
      }
    );
    expect(fetchImpl.mock.calls[0][0]).not.toContain(key);
  });
});
