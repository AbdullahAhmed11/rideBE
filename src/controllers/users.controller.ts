import type { Request, Response } from "express";
import mongoose from "mongoose";
import { User, type UserRole } from "../models/User.js";
import { AppError } from "../middleware/error.middleware.js";
import { hashPassword } from "../utils/password.js";
import { assertEmail, assertPasswordMatch } from "../utils/validation.js";
import { assertValidEgyptE164, normalizeEgyptPhone } from "../utils/phone.js";
import { serializeUserDoc } from "../utils/serializeUser.js";

const allowedRolesCreate: UserRole[] = ["user", "captain", "admin"];

function singleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function isDuplicateKeyError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: number }).code === 11000
  );
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    User.countDocuments(),
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  res.json({
    users: rows.map((u) => serializeUserDoc(u, req)),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }
  const u = await User.findById(userId).lean();
  if (!u) {
    throw new AppError("User not found", 404);
  }
  res.json({ user: serializeUserDoc(u, req) });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const id = singleParam(req.params.id);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid user id", 400);
  }
  const requesterId = req.userId;
  if (!requesterId) {
    throw new AppError("Unauthorized", 401);
  }
  const isAdmin = req.userRole === "admin";
  if (!isAdmin && !requesterId.equals(new mongoose.Types.ObjectId(id))) {
    throw new AppError("Forbidden", 403);
  }

  const u = await User.findById(id).lean();
  if (!u) {
    throw new AppError("User not found", 404);
  }
  res.json({ user: serializeUserDoc(u, req) });
}

export async function createUserAdmin(req: Request, res: Response): Promise<void> {
  const { fullName, phone, email, password, confirmPassword, role } = req.body as Record<
    string,
    unknown
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

  const nextRole =
    typeof role === "string" && allowedRolesCreate.includes(role as UserRole)
      ? (role as UserRole)
      : "user";

  assertPasswordMatch(password, confirmPassword);
  const phoneNorm = normalizeEgyptPhone(phone);
  assertValidEgyptE164(phoneNorm);
  const emailNorm = assertEmail(email);

  const passwordHash = await hashPassword(password);

  try {
    const doc: {
      fullName: string;
      phone: string;
      email: string;
      passwordHash: string;
      role: UserRole;
      captainRegistrationStep?: "pending_step2" | "complete";
    } = {
      fullName: fullName.trim(),
      phone: phoneNorm,
      email: emailNorm,
      passwordHash,
      role: nextRole,
    };
    if (nextRole === "captain") {
      doc.captainRegistrationStep = "complete";
    }
    const user = await User.create(doc);
    res.status(201).json({ user: serializeUserDoc(user.toObject(), req) });
  } catch (e: unknown) {
    if (isDuplicateKeyError(e)) {
      throw new AppError("Email or phone already registered", 409);
    }
    throw e;
  }
}

const imagePathKeys = [
  "profileImage",
  "carImage",
  "carImageId",
  "personIdImage",
  "criminalRecordImage",
  "personSelfy",
] as const;

export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = singleParam(req.params.id);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid user id", 400);
  }
  const requesterId = req.userId;
  if (!requesterId) {
    throw new AppError("Unauthorized", 401);
  }
  const isAdmin = req.userRole === "admin";
  if (!isAdmin && !requesterId.equals(new mongoose.Types.ObjectId(id))) {
    throw new AppError("Forbidden", 403);
  }

  const user = await User.findById(id).select("+passwordHash");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const body = req.body as Record<string, unknown>;

  if (typeof body.fullName === "string" && body.fullName.trim()) {
    user.fullName = body.fullName.trim();
  }
  if (typeof body.phone === "string" && body.phone.trim()) {
    const p = normalizeEgyptPhone(body.phone);
    assertValidEgyptE164(p);
    user.phone = p;
  }
  if (typeof body.email === "string" && body.email.trim()) {
    user.email = assertEmail(body.email);
  }
  if (typeof body.password === "string" && body.password) {
    assertPasswordMatch(body.password, body.confirmPassword);
    user.passwordHash = await hashPassword(body.password);
  }

  if (isAdmin) {
    if (
      typeof body.role === "string" &&
      ["user", "captain", "admin"].includes(body.role)
    ) {
      user.role = body.role as UserRole;
    }
    if (
      typeof body.captainRegistrationStep === "string" &&
      ["pending_step2", "complete"].includes(body.captainRegistrationStep)
    ) {
      user.captainRegistrationStep = body.captainRegistrationStep as
        | "pending_step2"
        | "complete";
    }
    for (const key of imagePathKeys) {
      if (typeof body[key] === "string") {
        (user as unknown as Record<string, string>)[key] = body[key] as string;
      }
    }
  }

  try {
    await user.save();
    const fresh = await User.findById(user._id).lean();
    if (!fresh) {
      throw new AppError("User not found after update", 500);
    }
    res.json({ user: serializeUserDoc(fresh, req) });
  } catch (e: unknown) {
    if (isDuplicateKeyError(e)) {
      throw new AppError("Email or phone conflict", 409);
    }
    throw e;
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const id = singleParam(req.params.id);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid user id", 400);
  }
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError("User not found", 404);
  }
  res.status(204).send();
}
