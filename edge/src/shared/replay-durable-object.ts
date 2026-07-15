import { isPlainObject, jsonResponse, problemResponse, readJsonObject } from "./http";
import { SecurityBoundaryError } from "./errors";

interface ReplayEntry {
  expiresAtEpochSeconds: number;
}

export class ReplayDurableObject {
  readonly #state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.#state = state;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (request.method !== "POST" || url.pathname !== "/v1/consume") {
        throw new SecurityBoundaryError(404, "REPLAY_ROUTE_NOT_FOUND", "경로를 찾을 수 없습니다.");
      }

      const parsed: unknown = await readJsonObject(request);
      if (
        !isPlainObject(parsed) ||
        typeof parsed.jti !== "string" ||
        parsed.jti.length === 0 ||
        parsed.jti.length > 256 ||
        !Number.isSafeInteger(parsed.expiresAtEpochSeconds)
      ) {
        throw new SecurityBoundaryError(400, "INVALID_REPLAY_ENTRY", "재사용 방지 항목이 올바르지 않습니다.");
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAtEpochSeconds = parsed.expiresAtEpochSeconds as number;
      if (expiresAtEpochSeconds <= now) {
        return jsonResponse({ consumed: false });
      }

      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parsed.jti));
      const key = `jti:${toHex(new Uint8Array(digest))}`;
      const consumed = await this.#state.storage.transaction(async (transaction) => {
        const existing = await transaction.get<ReplayEntry>(key);
        if (existing !== undefined && existing.expiresAtEpochSeconds > now) {
          return false;
        }
        await transaction.put<ReplayEntry>(key, { expiresAtEpochSeconds });
        return true;
      });

      if (consumed) {
        const alarm = await this.#state.storage.getAlarm();
        const requestedAlarm = expiresAtEpochSeconds * 1000;
        if (alarm === null || requestedAlarm < alarm) {
          await this.#state.storage.setAlarm(requestedAlarm);
        }
      }
      return jsonResponse({ consumed });
    } catch (error) {
      return problemResponse(error);
    }
  }

  async alarm(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const entries = await this.#state.storage.list<ReplayEntry>({ prefix: "jti:" });
    const expired: string[] = [];
    let nextExpiry: number | undefined;

    for (const [key, entry] of entries) {
      if (entry.expiresAtEpochSeconds <= now) {
        expired.push(key);
      } else if (nextExpiry === undefined || entry.expiresAtEpochSeconds < nextExpiry) {
        nextExpiry = entry.expiresAtEpochSeconds;
      }
    }

    if (expired.length > 0) {
      await this.#state.storage.delete(expired);
    }
    if (nextExpiry !== undefined) {
      await this.#state.storage.setAlarm(nextExpiry * 1000);
    }
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
