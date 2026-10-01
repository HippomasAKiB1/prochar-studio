import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { httpLogger } from "./middleware/logging.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";

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

// Mount routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);

