const DEFAULT_LOCAL_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === "") {
    return fallback;
  }

  return String(value).trim().toLowerCase() === "true";
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAllowedOrigins(value) {
  const origins = String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return origins.length ? Array.from(new Set(origins)) : DEFAULT_LOCAL_ORIGINS;
}

export function getRuntimeConfig() {
  const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
  const isProduction = nodeEnv === "production";

  return {
    allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
    analyzeRateLimitEnabled: parseBoolean(process.env.ANALYZE_RATE_LIMIT_ENABLED, isProduction),
    analyzeRateLimitMax: parsePositiveInteger(process.env.ANALYZE_RATE_LIMIT_MAX, 10),
    analyzeRateLimitWindowMs: parsePositiveInteger(
      process.env.ANALYZE_RATE_LIMIT_WINDOW_MS,
      60_000,
    ),
    host: (process.env.HOST || "127.0.0.1").trim(),
    isProduction,
    nodeEnv,
    port: parsePositiveInteger(process.env.PORT, 3001),
    publicUrl: (process.env.PUBLIC_URL || "").trim().replace(/\/$/, ""),
    serveClient: parseBoolean(process.env.SERVE_CLIENT, isProduction),
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  };
}
