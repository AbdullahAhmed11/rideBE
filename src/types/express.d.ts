import type { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
      userRole?: "user" | "captain" | "admin";
    }
  }
}

export {};
