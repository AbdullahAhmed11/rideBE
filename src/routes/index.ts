import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { tripsRouter } from "./trips.routes.js";
import { usersRouter } from "./users.routes.js";

export const apiV1Router = Router();

apiV1Router.get("/", (_req, res) => {
  res.json({
    name: "Ride",
    version: "1.0.0",
  });
});

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/users", usersRouter);
apiV1Router.use("/trips", tripsRouter);
