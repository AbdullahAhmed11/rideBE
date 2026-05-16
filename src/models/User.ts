import mongoose, { Schema } from "mongoose";

export type UserRole = "user" | "captain" | "admin";
export type CaptainRegistrationStep = "pending_step2" | "complete";

export interface IUser {
  fullName: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  captainRegistrationStep?: CaptainRegistrationStep;
  profileImage?: string;
  carImage?: string;
  carImageId?: string;
  personIdImage?: string;
  criminalRecordImage?: string;
  personSelfy?: string;
}

function stripPassword(_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> {
  delete ret.passwordHash;
  return ret;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["user", "captain", "admin"],
      required: true,
    },
    captainRegistrationStep: {
      type: String,
      enum: ["pending_step2", "complete"],
    },
    profileImage: { type: String, trim: true },
    carImage: { type: String, trim: true },
    carImageId: { type: String, trim: true },
    personIdImage: { type: String, trim: true },
    criminalRecordImage: { type: String, trim: true },
    personSelfy: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { transform: stripPassword },
    toObject: { transform: stripPassword },
  },
);

export const User = mongoose.model<IUser>("User", userSchema);
