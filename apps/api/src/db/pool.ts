import pg from "pg";
import { env } from "../config/env.js";
import { sanitizeLogValue } from "../utils/sanitizeLogValue.js";

const { Pool, types } = pg;

// PostgreSQL date has no timezone; keep it as YYYY-MM-DD instead of converting it to an instant.
types.setTypeParser(1082, (value) => value);

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
    const message = sanitizeLogValue(error.message);
    const safeMessage = typeof message === "string" ? message : "데이터베이스 오류";
    return code ? { code, message: safeMessage } : { message: safeMessage };
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
