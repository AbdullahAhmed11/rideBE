import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import type { UserRole } from "../models/User.js";
import { AppError } from "./error.middleware.js";

interface JwtPayload {
  sub: string;
  role?: UserRole;
}

const roles: UserRole[] = ["user", "captain", "admin"];

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    if (!mongoose.Types.ObjectId.isValid(decoded.sub)) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
      return;
    }
    req.userId = new mongoose.Types.ObjectId(decoded.sub);
    req.userRole = decoded.role && roles.includes(decoded.role) ? decoded.role : "user";
    next();
  } catch {
    next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }
}
