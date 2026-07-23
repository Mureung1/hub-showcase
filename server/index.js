import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info({ host: "0.0.0.0", port: env.PORT }, "API server started");
});

function shutdown(signal) {
  logger.info({ signal }, "API server shutting down");
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, "API server shutdown failed");
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
