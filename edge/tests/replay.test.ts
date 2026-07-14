import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { DurableObjectReplayStore, InMemoryReplayStore } from "../src/shared/replay";

describe("일회성 jti 저장소", () => {
  it("메모리 구현은 동일 jti와 만료 jti를 거부한다", async () => {
    const store = new InMemoryReplayStore(() => 100);
    await expect(store.consume("one-time", 110)).resolves.toBe(true);
    await expect(store.consume("one-time", 110)).resolves.toBe(false);
    await expect(store.consume("expired", 100)).resolves.toBe(false);
  });

  it("Durable Object 구현은 같은 partition에서 원자적으로 한 번만 소비한다", async () => {
    const partition = `test-${crypto.randomUUID()}`;
    const store = new DurableObjectReplayStore(env.REPLAY_STORE, partition);
    const expiresAt = Math.floor(Date.now() / 1000) + 60;

    const [first, second] = await Promise.all([
      store.consume("durable-jti", expiresAt),
      store.consume("durable-jti", expiresAt)
    ]);

    expect([first, second].sort()).toEqual([false, true]);
  });
});
