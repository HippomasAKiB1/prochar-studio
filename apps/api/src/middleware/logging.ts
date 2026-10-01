import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";
import type { Request } from "express";

export const httpLogger = pinoHttp({
  logger,
  serializers: {
    req(req: Request) {
      const sanitized: Record<string, unknown> = {
        id: req.id,
        method: req.method,
        url: req.url,
      };

      const url = req.url || "";
      const isAuthOrUpload =
        url.startsWith("/api/auth") ||
        url.startsWith("/auth") ||
        url.startsWith("/api/upload") ||
        url.startsWith("/upload");

      // Never log req.body on auth/upload routes
      if (!isAuthOrUpload && req.body && Object.keys(req.body).length > 0) {
        sanitized.body = req.body;
      }

      return sanitized;
    },
  },
});
