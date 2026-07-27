import type { Server } from "node:http";
import { sanitizeLogValue } from "../utils/sanitizeLogValue.js";

interface ShutdownHandlerOptions {
  closeDatabasePool: () => Promise<void>;
  stopBackgroundTasks?: () => Promise<void>;
  server: Pick<Server, "close">;
  timeoutMs?: number;
}

export function createShutdownHandler({
  closeDatabasePool,
  stopBackgroundTasks = async () => undefined,
  server,
  timeoutMs = 30_000,
}: ShutdownHandlerOptions): (signal: NodeJS.Signals) => Promise<void> {
  let shuttingDown = false;

  return async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`[server] ${signal} 수신, 정상 종료를 시작합니다.`);

    const forceExitTimer = setTimeout(() => {
      console.error(`[server] ${timeoutMs / 1000}초 내 종료하지 못해 강제 종료합니다.`);
      process.exit(1);
    }, timeoutMs);
    forceExitTimer.unref();

    try {
      await stopBackgroundTasks();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      await closeDatabasePool();
      clearTimeout(forceExitTimer);
      console.info("[server] 정상 종료를 완료했습니다.");
    } catch (error) {
      clearTimeout(forceExitTimer);
      console.error("[server] 정상 종료 중 오류가 발생했습니다.", sanitizeLogValue(error));
      process.exitCode = 1;
    }
  };
}
