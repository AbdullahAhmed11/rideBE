import { AppError } from "../middleware/error.middleware.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertEmail(email: string): string {
  const e = email.trim().toLowerCase();
  if (!e || !EMAIL_RE.test(e)) {
    throw new AppError("Invalid email address", 400, "INVALID_EMAIL");
  }
  return e;
}

export function assertPasswordMatch(password: string, confirmPassword: unknown): void {
  if (confirmPassword !== password) {
    throw new AppError("password and confirmPassword do not match", 400, "PASSWORD_MISMATCH");
  }
}
