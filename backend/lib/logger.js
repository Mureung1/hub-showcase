import pino from "pino";

import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "todays-fridge-api", environment: env.NODE_ENV },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "password", "token"],
    censor: "[REDACTED]",
  },
});
