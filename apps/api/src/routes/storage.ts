import { Router, Request, Response } from "express";
import path from "node:path";
import fs from "node:fs";
import { env } from "../config/env.js";
import { getStorageProvider, LocalStorageProvider } from "../services/storage/index.js";

export const storageRouter = Router();

/**
 * GET /api/storage/*
 * Serves locally stored files in development or when STORAGE_PROVIDER=local.
 */
storageRouter.get("/*", (req: Request, res: Response): void => {
  if (env.NODE_ENV === "production" && env.STORAGE_PROVIDER !== "local") {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "Local storage serving is disabled in production",
    });
    return;
  }

  const provider = getStorageProvider();
  if (!(provider instanceof LocalStorageProvider)) {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "Local storage provider not active",
    });
    return;
  }

  const relPath = req.params[0] || req.path.replace(/^\//, "");
  const baseDir = provider.getBaseDir();
  const filePath = path.resolve(baseDir, relPath);

  // Security check: Guard against directory traversal
  if (!filePath.startsWith(path.resolve(baseDir))) {
    res.status(403).json({
      error: "FORBIDDEN",
      message: "Invalid file path",
    });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "File not found",
    });
    return;
  }

  res.sendFile(filePath);
});
