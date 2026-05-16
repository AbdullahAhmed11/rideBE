import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error.middleware.js";

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.userRole !== "admin") {
    next(new AppError("Forbidden", 403, "FORBIDDEN"));
    return;
  }
  next();
}
