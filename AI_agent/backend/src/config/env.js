import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "",
  careerNetApiKey: process.env.CAREER_NET_API_KEY || "",
  publicDataApiKey: process.env.PUBLIC_DATA_API_KEY || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || "",
};
