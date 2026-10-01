import type { Request, Response } from "express";

let dbStatusGetter: () => "up" | "down" = () => "up";

export function setDbStatusGetter(getter: () => "up" | "down"): void {
  dbStatusGetter = getter;
}

export function getHealth(_req: Request, res: Response): void {
  // Constraint: exactly { "status": "ok", "db": "up", "uptime": <n> }
  res.status(200).json({
    status: "ok",
    db: dbStatusGetter(),
    uptime: Math.floor(process.uptime()),
  });
}
