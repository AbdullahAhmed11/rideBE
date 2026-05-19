import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, type UserRole } from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { AppError } from "../middleware/error.middleware.js";
import { assertEmail, assertPasswordMatch } from "../utils/validation.js";
import { assertValidEgyptE164, normalizeEgyptPhone } from "../utils/phone.js";
import { serializeUserDoc } from "../utils/serializeUser.js";

function signToken(userId: string, role: UserRole): string {
  return jwt.sign({ sub: userId, role }, env.jwtSecret, { expiresIn: "7d" });
}

function isDuplicateKeyError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: number }).code === 11000
  );
}

export async function registerUser(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    throw new AppError("profileImage file is required", 400);
  }

  const {
    fullName,
    phone,
    email,
    password,
    confirmPassword,
    role,
  } = req.body as Record<string, unknown>;

  if (typeof fullName !== "string" || !fullName.trim()) {
    throw new AppError("fullName is required", 400);
  }
  if (typeof password !== "string" || !password) {
    throw new AppError("password is required", 400);
  }
  if (typeof phone !== "string" || typeof email !== "string") {
    throw new AppError("phone and email are required", 400);
  }

  assertPasswordMatch(password, confirmPassword);
  const phoneNorm = normalizeEgyptPhone(phone);
  assertValidEgyptE164(phoneNorm);
  const emailNorm = assertEmail(email);
  const nextRole: UserRole = role === "admin" ? "admin" : "user";

  const profilePath = `/uploads/${file.filename}`;
  const passwordHash = await hashPassword(password);
  try {
    const user = await User.create({
      fullName: fullName.trim(),
      phone: phoneNorm,
      email: emailNorm,
      passwordHash,
      role: nextRole,
      profileImage: profilePath,
    });
    const token = signToken(user.id, nextRole);
    res.status(201).json({
      token,
      user: serializeUserDoc(user.toObject(), req),
    });
  } catch (e: unknown) {
    if (isDuplicateKeyError(e)) {
      throw new AppError("Email or phone already registered", 409);
    }
    throw e;
  }
}

export async function loginUser(req: Request, res: Response): Promise<void> {
  const raw = req.body as { phone?: string };
  if (typeof raw.phone !== "string" || !raw.phone.trim()) {
    throw new AppError("phone is required", 400);
  }

  const phoneNorm = normalizeEgyptPhone(raw.phone);
  assertValidEgyptE164(phoneNorm);

  const user = await User.findOne({ phone: phoneNorm });
  if (!user || (user.role !== "user" && user.role !== "admin")) {
    throw new AppError("User not found for this phone number", 404, "USER_NOT_FOUND");
  }

  const token = signToken(user.id, user.role);
  res.json({
    token,
    user: serializeUserDoc(user.toObject(), req),
  });
}

export async function registerCaptainStep1(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    throw new AppError("profileImage file is required", 400);
  }

  const { fullName, email, phone, password, confirmPassword } = req.body as Record<
    string,
    string
  >;

  if (typeof fullName !== "string" || !fullName.trim()) {
    throw new AppError("fullName is required", 400);
  }
  if (typeof password !== "string" || !password) {
    throw new AppError("password is required", 400);
  }
  if (typeof phone !== "string" || typeof email !== "string") {
    throw new AppError("phone and email are required", 400);
  }

  assertPasswordMatch(password, confirmPassword);
  const phoneNorm = normalizeEgyptPhone(phone);
  assertValidEgyptE164(phoneNorm);
  const emailNorm = assertEmail(email);

  const profilePath = `/uploads/${file.filename}`;
  const passwordHash = await hashPassword(password);

  try {
    const user = await User.create({
      fullName: fullName.trim(),
      phone: phoneNorm,
      email: emailNorm,
      passwordHash,
      role: "captain",
      captainRegistrationStep: "pending_step2",
      profileImage: profilePath,
    });
    const token = signToken(user.id, "captain");
    res.status(201).json({
      token,
      user: serializeUserDoc(user.toObject(), req),
    });
  } catch (e: unknown) {
    if (isDuplicateKeyError(e)) {
      throw new AppError("Email or phone already registered", 409);
    }
    throw e;
  }
}

type MulterFile = { filename: string };
type FileMap = Record<string, MulterFile[] | undefined>;

export async function registerCaptainStep2(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const user = await User.findById(userId);
  if (!user || user.role !== "captain") {
    throw new AppError("Only captains can complete this step", 403);
  }
  if (user.captainRegistrationStep !== "pending_step2") {
    throw new AppError("Captain registration step 2 is not pending or already completed", 400);
  }

  const files = req.files as FileMap | undefined;
  const pick = (name: string): MulterFile | undefined => files?.[name]?.[0];

  const carImage = pick("carImage");
  const carImageId = pick("carImageId");
  const personIdImage = pick("personIdImage");
  const criminalRecordImage = pick("criminalRecordImage");
  const personSelfy = pick("personSelfy");

  if (!carImage || !carImageId || !personIdImage || !criminalRecordImage || !personSelfy) {
    throw new AppError(
      "All images are required: carImage, carImageId, personIdImage, criminalRecordImage, personSelfy",
      400,
    );
  }

  user.carImage = `/uploads/${carImage.filename}`;
  user.carImageId = `/uploads/${carImageId.filename}`;
  user.personIdImage = `/uploads/${personIdImage.filename}`;
  user.criminalRecordImage = `/uploads/${criminalRecordImage.filename}`;
  user.personSelfy = `/uploads/${personSelfy.filename}`;
  user.captainRegistrationStep = "complete";
  await user.save();

  const fresh = await User.findById(user._id);
  if (!fresh) {
    throw new AppError("User not found after update", 500);
  }

  const token = signToken(fresh.id, "captain");
  res.json({
    token,
    user: serializeUserDoc(fresh.toObject(), req),
  });
}

export async function loginCaptain(req: Request, res: Response): Promise<void> {
  const { phone, password } = req.body as { phone?: string; password?: string };
  if (typeof phone !== "string" || typeof password !== "string" || !password) {
    throw new AppError("phone and password are required", 400);
  }

  const phoneNorm = normalizeEgyptPhone(phone);
  assertValidEgyptE164(phoneNorm);

  const user = await User.findOne({ phone: phoneNorm }).select("+passwordHash");
  if (!user || user.role !== "captain") {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }
  if (user.captainRegistrationStep !== "complete") {
    throw new AppError("Complete captain registration (step 2) before logging in", 403, "REGISTRATION_INCOMPLETE");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const token = signToken(user.id, "captain");
  res.json({
    token,
    user: serializeUserDoc(user.toObject(), req),
  });
}
