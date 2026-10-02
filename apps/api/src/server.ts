import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { closeBrowser } from "./services/render/puppeteer.service.js";

let server: ReturnType<typeof app.listen> | null = null;

async function bootstrap() {
  try {
    await connectDb();
    logger.info("Connected to MongoDB successfully");

    server = app.listen(env.PORT, () => {
      logger.info(`Prochar Studio API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.fatal({ err }, "Fatal startup error");
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, initiating graceful shutdown...`);

  try {
    await closeBrowser();
  } catch (err) {
    logger.error({ err }, "Error closing browser during shutdown");
  }

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");
      await disconnectDb();
      logger.info("Graceful shutdown completed");
      process.exit(0);
    });
  } else {
    await disconnectDb();
    process.exit(0);
  }

  // Force shutdown after 10s if stuck
  setTimeout(() => {
    logger.error("Forceful shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Only boot server when run directly (not during unit testing)
if (process.env.NODE_ENV !== "test") {
  bootstrap();
}

export { server, gracefulShutdown };
