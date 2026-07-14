import { SecurityBoundaryError } from "./errors";
import { isPlainObject } from "./http";

export interface ReplayStore {
  consume(jti: string, expiresAtEpochSeconds: number): Promise<boolean>;
}

export class DurableObjectReplayStore implements ReplayStore {
  readonly #namespace: DurableObjectNamespace;
  readonly #partition: string;

  constructor(namespace: DurableObjectNamespace, partition: string) {
    this.#namespace = namespace;
    this.#partition = partition;
  }

  async consume(jti: string, expiresAtEpochSeconds: number): Promise<boolean> {
    const id = this.#namespace.idFromName(this.#partition);
    const stub = this.#namespace.get(id);
    const response = await stub.fetch("https://replay.internal/v1/consume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jti, expiresAtEpochSeconds })
    });

    if (!response.ok) {
      throw new SecurityBoundaryError(
        503,
        "REPLAY_STORE_UNAVAILABLE",
        "재사용 방지 저장소를 사용할 수 없습니다."
      );
    }

    const parsed: unknown = await response.json();
    if (!isPlainObject(parsed) || typeof parsed.consumed !== "boolean") {
      throw new SecurityBoundaryError(
        503,
        "REPLAY_STORE_INVALID_RESPONSE",
        "재사용 방지 저장소 응답이 올바르지 않습니다."
      );
    }
    return parsed.consumed;
  }
}

export class InMemoryReplayStore implements ReplayStore {
  readonly #entries = new Map<string, number>();
  readonly #clock: () => number;

  constructor(clock: () => number = () => Math.floor(Date.now() / 1000)) {
    this.#clock = clock;
  }

  async consume(jti: string, expiresAtEpochSeconds: number): Promise<boolean> {
    const now = this.#clock();
    for (const [key, expiry] of this.#entries) {
      if (expiry <= now) {
        this.#entries.delete(key);
      }
    }
    if (expiresAtEpochSeconds <= now || this.#entries.has(jti)) {
      return false;
    }
    this.#entries.set(jti, expiresAtEpochSeconds);
    return true;
  }
}
