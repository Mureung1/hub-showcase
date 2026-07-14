import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

const STARTUP_MAX_ATTEMPTS = 3;
const STARTUP_RETRY_DELAY_MS = 2_000;

export const databasePool = new Pool({
  application_name: "baro-jinryo-api",
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  max: env.DB_POOL_MAX,
  ssl: {
    rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED,
  },
});

interface DatabaseErrorSummary {
  code?: string;
  message: string;
}

function summarizeDatabaseError(error: unknown): DatabaseErrorSummary {
  if (error instanceof Error) {
    const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
    return code ? { code, message: error.message } : { message: error.message };
  }

  return { message: "알 수 없는 데이터베이스 오류" };
}

export function logDatabaseError(context: string, error: unknown): void {
  const summary = summarizeDatabaseError(error);
  console.error(`[database] ${context}`, summary);
}

interface PoolErrorSource {
  on(event: "error", listener: (error: Error) => void): unknown;
}

export function registerDatabasePoolErrorHandler(
  pool: PoolErrorSource,
  logger: typeof logDatabaseError = logDatabaseError,
): void {
  pool.on("error", (error) => {
    logger("유휴 연결 오류", error);
  });
}

registerDatabasePoolErrorHandler(databasePool);

export async function checkDatabaseConnection(): Promise<number> {
  const startedAt = performance.now();
  await databasePool.query("SELECT 1");
  return Math.max(0, Math.round(performance.now() - startedAt));
}

interface StartupRetryOptions {
  checkConnection?: () => Promise<number>;
  maxAttempts?: number;
  retryDelayMs?: number;
  wait?: (delayMs: number) => Promise<void>;
}

export async function waitForDatabaseAtStartup(options: StartupRetryOptions = {}): Promise<void> {
  const checkConnection = options.checkConnection ?? checkDatabaseConnection;
  const maxAttempts = options.maxAttempts ?? STARTUP_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? STARTUP_RETRY_DELAY_MS;
  const wait =
    options.wait ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const latencyMs = await checkConnection();
      console.info(`[database] 연결 확인 완료 (${latencyMs}ms)`);
      return;
    } catch (error) {
      logDatabaseError(`시작 연결 실패 (${attempt}/${maxAttempts})`, error);

      if (attempt === maxAttempts) {
        throw error;
      }

      await wait(retryDelayMs);
    }
  }
}

export async function closeDatabasePool(): Promise<void> {
  await databasePool.end();
}
