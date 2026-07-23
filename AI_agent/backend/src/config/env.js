import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "career-mission-ai-local-jwt-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.4-nano",
  openaiFeedbackEnabled: process.env.OPENAI_FEEDBACK_ENABLED !== "false",
  careerNetApiKey: process.env.CAREER_NET_API_KEY || "",
  publicDataApiKey: process.env.PUBLIC_DATA_API_KEY || "",
  searchCacheTtlMs: Number(process.env.SEARCH_CACHE_TTL_MS || 10 * 60 * 1000),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || "",
};
