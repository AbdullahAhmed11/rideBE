import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  registerUser,
  loginUser,
  registerCaptainStep1,
  registerCaptainStep2,
  loginCaptain,
} from "../controllers/auth.controller.js";
import {
  uploadProfileImageSingle,
  uploadCaptainStep2,
  parseMultipartFormText,
} from "../middleware/upload.middleware.js";

export const authRouter = Router();

authRouter.post("/register/user", uploadProfileImageSingle, asyncHandler(registerUser));
authRouter.post("/login/user", parseMultipartFormText, asyncHandler(loginUser));

authRouter.post(
  "/register/captain/step1",
  uploadProfileImageSingle,
  asyncHandler(registerCaptainStep1),
);
authRouter.post(
  "/register/captain/step2",
  requireAuth,
  uploadCaptainStep2,
  asyncHandler(registerCaptainStep2),
);

authRouter.post("/login/captain", asyncHandler(loginCaptain));
