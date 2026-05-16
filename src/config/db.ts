import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 15_000,
      /** Prefer IPv4 — avoids some Atlas "ReplicaSetNoPrimary" failures when IPv6 routes poorly. */
      family: 4,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      [
        "MongoDB connection failed:",
        detail,
        "",
        "If you use MongoDB Atlas:",
        "- Atlas → Network Access → add your current IP (or 0.0.0.0/0 for local testing only).",
        "- Confirm the cluster is not paused; Database → Users password matches MONGODB_URI.",
        "- URL-encode special characters in the password component of MONGODB_URI.",
        "",
        "Local MongoDB (no Atlas): set MONGODB_URI=mongodb://127.0.0.1:27017/ride",
      ].join("\n"),
    );
    throw err;
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});
