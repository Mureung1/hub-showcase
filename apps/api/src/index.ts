import { createApp } from "./app.js";
import { createWaitingExpirationService } from "./composition/waitingExpiration.js";
import { env } from "./config/env.js";
import { closeDatabasePool, logDatabaseError, waitForDatabaseAtStartup } from "./db/pool.js";
import { createShutdownHandler } from "./server/shutdown.js";
import { createRecurringTask } from "./server/recurringTask.js";

const SHUTDOWN_TIMEOUT_MS = 30_000;

async function startServer(): Promise<void> {
  await waitForDatabaseAtStartup();

  const app = createApp();
  const server = app.listen(env.API_PORT, "127.0.0.1", () => {
    console.info(`바로진료 API: http://127.0.0.1:${env.API_PORT}`);
  });
  const expirationService = createWaitingExpirationService();
  const expirationTask = createRecurringTask({
    intervalMs: env.BACKGROUND_JOB_INTERVAL_MS,
    task: async () => {
      const result = await expirationService.run();
      if (result.lockAcquired && (result.cancelledCount > 0 || result.movedCount > 0)) {
        console.info("[waiting-expiration] 처리 완료", {
          cancelledCount: result.cancelledCount,
          movedCount: result.movedCount,
        });
      }
    },
  });
  expirationTask.start();

  const shutdown = createShutdownHandler({
    closeDatabasePool,
    stopBackgroundTasks: () => expirationTask.stop(),
    server,
    timeoutMs: SHUTDOWN_TIMEOUT_MS,
  });

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

startServer().catch(async (error: unknown) => {
  logDatabaseError("서버 시작 중단", error);
  await closeDatabasePool().catch((closeError: unknown) => {
    logDatabaseError("연결 풀 종료 실패", closeError);
  });
  process.exitCode = 1;
});
