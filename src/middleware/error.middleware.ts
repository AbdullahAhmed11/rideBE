import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({ message: err.message, code: err.code });
    return;
  }

  if (err instanceof Error && err.message.includes("Only image uploads")) {
    res.status(400).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
}
