import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { httpLogger } from "./middleware/logging.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { storageRouter } from "./routes/storage.js";
import { uploadRouter } from "./routes/upload.js";
import { templatesRouter } from "./routes/templates.js";
import { globalLimiter } from "./middleware/rate-limit.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(httpLogger);

// Global rate limiting on /api
app.use("/api", globalLimiter);

// Mount routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/storage", storageRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/templates", templatesRouter);



