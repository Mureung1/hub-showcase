import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeDatabasePool, logDatabaseError, waitForDatabaseAtStartup } from "./db/pool.js";
import { createShutdownHandler } from "./server/shutdown.js";

const SHUTDOWN_TIMEOUT_MS = 30_000;

async function startServer(): Promise<void> {
  await waitForDatabaseAtStartup();

  const app = createApp();
  const server = app.listen(env.API_PORT, "127.0.0.1", () => {
    console.info(`바로진료 API: http://127.0.0.1:${env.API_PORT}`);
  });

  const shutdown = createShutdownHandler({
    closeDatabasePool,
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
