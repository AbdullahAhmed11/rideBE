import type { Request } from "express";
import type { IUser } from "../models/User.js";
import { publicUploadUrl } from "./publicUrl.js";

const IMAGE_FIELDS = [
  "profileImage",
  "carImage",
  "carImageId",
  "personIdImage",
  "criminalRecordImage",
  "personSelfy",
] as const;

type UserLike = Partial<IUser> & {
  _id?: { toString(): string };
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export function serializeUserDoc(u: UserLike, req: Request): Record<string, unknown> {
  const id =
    typeof u.id === "string"
      ? u.id
      : u._id
        ? String(u._id)
        : undefined;
  if (!id) {
    return {};
  }
  const out: Record<string, unknown> = {
    id,
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    role: u.role,
  };
  if (u.captainRegistrationStep) {
    out.captainRegistrationStep = u.captainRegistrationStep;
  }
  for (const key of IMAGE_FIELDS) {
    const val = u[key];
    if (typeof val === "string" && val) {
      out[key] = publicUploadUrl(req, val);
    }
  }
  if (u.createdAt) out.createdAt = u.createdAt.toISOString();
  if (u.updatedAt) out.updatedAt = u.updatedAt.toISOString();
  return out;
}
