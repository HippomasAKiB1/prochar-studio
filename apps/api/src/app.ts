import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { httpLogger } from "./middleware/logging.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(httpLogger);

// Mount health route at /api/health
app.use("/api/health", healthRouter);
