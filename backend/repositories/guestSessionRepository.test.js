import { describe, expect, it, vi } from "vitest";
import {
  findActiveGuestSessionByKeyHash,
  listConversationMessagesByGuestSession
} from "./guestSessionRepository.js";

function createQueryClient(result) {
  const query = {};
  ["select", "eq", "gt", "order", "limit"].forEach((method) => {
    query[method] = vi.fn(() => query);
  });
  query.maybeSingle = vi.fn(async () => result);

  return {
    from: vi.fn(() => query),
    query
  };
}

describe("guest session repository isolation", () => {
  it("finds only an unexpired session matching the exact key hash", async () => {
    const client = createQueryClient({ data: { id: "guest-1" }, error: null });
    const keyHash = "a".repeat(64);
    const now = new Date("2026-07-29T00:00:00.000Z");

    await findActiveGuestSessionByKeyHash(keyHash, now, client);

    expect(client.from).toHaveBeenCalledWith("guest_sessions");
    expect(client.query.eq).toHaveBeenCalledWith("key_hash", keyHash);
    expect(client.query.gt).toHaveBeenCalledWith(
      "expires_at",
      now.toISOString()
    );
  });

  it("lists messages through an exact guest session ownership filter", async () => {
    const client = createQueryClient({ data: [], error: null });
    const guestSessionId = "550e8400-e29b-41d4-a716-446655440000";

    await listConversationMessagesByGuestSession(guestSessionId, 20, client);

    expect(client.from).toHaveBeenCalledWith("conversation_messages");
    expect(client.query.eq).toHaveBeenCalledWith(
      "guest_session_id",
      guestSessionId
    );
    expect(client.query.limit).toHaveBeenCalledWith(20);
  });

  it("rejects invalid ownership identifiers before querying", async () => {
    const client = createQueryClient({ data: [], error: null });

    await expect(
      listConversationMessagesByGuestSession("all-guests", 20, client)
    ).rejects.toThrow("valid UUID");
    expect(client.from).not.toHaveBeenCalled();
  });
});
