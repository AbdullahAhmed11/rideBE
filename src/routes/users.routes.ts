import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import {
  listUsers,
  getMe,
  getUser,
  createUserAdmin,
  updateUser,
  deleteUser,
} from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, asyncHandler(getMe));

usersRouter.get("/", requireAuth, requireAdmin, asyncHandler(listUsers));
usersRouter.post("/", requireAuth, requireAdmin, asyncHandler(createUserAdmin));

usersRouter.get("/:id", requireAuth, asyncHandler(getUser));
usersRouter.patch("/:id", requireAuth, asyncHandler(updateUser));
usersRouter.delete("/:id", requireAuth, requireAdmin, asyncHandler(deleteUser));
