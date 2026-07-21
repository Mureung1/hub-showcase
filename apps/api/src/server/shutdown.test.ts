import type { Server } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createShutdownHandler } from "./shutdown.js";

describe("server shutdown", () => {
  it("백그라운드 작업과 HTTP 서버를 닫은 뒤 DB Pool을 한 번만 종료한다", async () => {
    const events: string[] = [];
    const server = {
      close: vi.fn((callback?: (error?: Error) => void) => {
        events.push("http");
        callback?.();
        return server as unknown as Server;
      }),
    };
    const closeDatabasePool = vi.fn(async () => {
      events.push("database");
    });
    const stopBackgroundTasks = vi.fn(async () => {
      events.push("background");
    });
    const shutdown = createShutdownHandler({
      server,
      closeDatabasePool,
      stopBackgroundTasks,
    });

    await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(stopBackgroundTasks).toHaveBeenCalledTimes(1);
    expect(closeDatabasePool).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["background", "http", "database"]);
  });
});
