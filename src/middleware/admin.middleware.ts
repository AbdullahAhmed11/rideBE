import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User.js";
import { AppError } from "./error.middleware.js";

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.userId) {
    next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    return;
  }

  const user = await User.findById(req.userId).select("role").lean();
  if (!user || user.role !== "admin") {
    next(new AppError("Forbidden", 403, "FORBIDDEN"));
    return;
  }

  req.userRole = "admin";
  next();
}
