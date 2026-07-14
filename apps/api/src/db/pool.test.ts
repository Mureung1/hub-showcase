import { describe, expect, it, vi } from "vitest";
import { registerDatabasePoolErrorHandler, waitForDatabaseAtStartup } from "./pool.js";

describe("database pool lifecycle", () => {
  it("연결 실패 후 2초 간격으로 최대 3회 재시도한다", async () => {
    const connectionError = new Error("temporary connection failure");
    const checkConnection = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(connectionError)
      .mockRejectedValueOnce(connectionError)
      .mockResolvedValueOnce(12);
    const wait = vi.fn<(delayMs: number) => Promise<void>>().mockResolvedValue(undefined);

    await waitForDatabaseAtStartup({ checkConnection, wait });

    expect(checkConnection).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenNthCalledWith(1, 2_000);
    expect(wait).toHaveBeenNthCalledWith(2, 2_000);
  });

  it("세 번째 연결 실패를 호출자에게 전달한다", async () => {
    const connectionError = new Error("database unavailable");
    const checkConnection = vi.fn<() => Promise<number>>().mockRejectedValue(connectionError);
    const wait = vi.fn<(delayMs: number) => Promise<void>>().mockResolvedValue(undefined);

    await expect(waitForDatabaseAtStartup({ checkConnection, wait })).rejects.toBe(connectionError);
    expect(checkConnection).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("유휴 연결 오류를 기록하고 예외를 다시 던지지 않는다", () => {
    let errorHandler: ((error: Error) => void) | undefined;
    const pool = {
      on: vi.fn((event: "error", handler: (error: Error) => void) => {
        expect(event).toBe("error");
        errorHandler = handler;
        return pool;
      }),
    };
    const logger = vi.fn();

    registerDatabasePoolErrorHandler(pool, logger);
    expect(() => errorHandler?.(new Error("idle connection failure"))).not.toThrow();
    expect(logger).toHaveBeenCalledWith("유휴 연결 오류", expect.any(Error));
  });
});
