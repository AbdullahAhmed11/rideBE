import { Router } from "express";
import { listTrips, createTrip } from "../controllers/trips.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const tripsRouter = Router();

tripsRouter.use(requireAuth);
tripsRouter.get("/", asyncHandler(listTrips));
tripsRouter.post("/", asyncHandler(createTrip));
