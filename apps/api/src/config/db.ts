import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { setDbStatusGetter } from "../controllers/health.controller.js";

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Hook up the db status getter for /api/health
setDbStatusGetter(() => (isDbConnected() ? "up" : "down"));

export async function connectDb(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connection established");
  });

  mongoose.connection.on("error", (err) => {
    logger.error({ err }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("MongoDB connection closed");
  }
}
