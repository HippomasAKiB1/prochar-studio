import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { closeBrowser } from "./services/render/puppeteer.service.js";
import { Poster } from "./models/Poster.js";


/**
 * Chunk 5.9 — Stuck-job recovery.
 * On boot, find any posters that were left in "generating" status for > 5 minutes
 * (indicating the process crashed mid-job) and mark them as "failed".
 * retryCount is NOT incremented (per FR-R3).
 */
export async function recoverStuckJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
  const result = await Poster.updateMany(
    { status: "generating", updatedAt: { $lt: cutoff } },
    {
      $set: {
        status: "failed",
        error: {
          code: "JOB_INTERRUPTED",
          message: "Generation was interrupted. Please try again.",
        },
      },
    }
  );

  logger.info(
    { recovered: result.modifiedCount },
    `Stuck-job recovery: marked ${result.modifiedCount} interrupted poster(s) as failed`
  );
}

let server: ReturnType<typeof app.listen> | null = null;


async function bootstrap() {
  try {
    await connectDb();
    logger.info("Connected to MongoDB successfully");

    // Chunk 5.9: Stuck-job recovery (one-shot on boot, not an interval)
    await recoverStuckJobs();

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
