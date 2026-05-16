import type { Request } from "express";
import { env } from "../config/env.js";

/** `storedPath` is like `/uploads/abc.jpg` */
export function publicUploadUrl(req: Request, storedPath: string): string {
  if (!storedPath.startsWith("/")) {
    return storedPath;
  }
  const base = env.apiPublicUrl?.replace(/\/$/, "");
  if (base) {
    return `${base}${storedPath}`;
  }
  const host = req.get("host") ?? "localhost";
  const proto = req.protocol;
  return `${proto}://${host}${storedPath}`;
}
