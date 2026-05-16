import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { join } from "node:path";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { apiV1Router } from "./routes/index.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigins.length > 0 ? env.clientOrigins : false,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  app.use(healthRouter);
  app.use("/api/v1", apiV1Router);

  app.use(errorMiddleware);
  return app;
}
