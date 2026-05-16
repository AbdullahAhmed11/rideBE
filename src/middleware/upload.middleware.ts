import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const uploadsDir = join(process.cwd(), "uploads");
mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase().slice(0, 12) || ".bin";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (allowedMime.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image uploads are allowed (jpeg, png, webp, gif)"));
  }
};

const limits = { fileSize: 5 * 1024 * 1024 };

/** Rider register + captain step 1: one profile image. */
export const uploadProfileImageSingle = multer({
  storage,
  fileFilter: imageFilter,
  limits,
}).single("profileImage");

const multipartTextOnly = multer().none();

/** Lets `login/user` accept Postman “form-data” (text fields only) as well as JSON. */
export function parseMultipartFormText(req: Request, res: Response, next: NextFunction): void {
  const ct = req.headers["content-type"] ?? "";
  if (ct.includes("multipart/form-data")) {
    multipartTextOnly(req, res, next);
    return;
  }
  next();
}

export const uploadCaptainStep2 = multer({
  storage,
  fileFilter: imageFilter,
  limits,
}).fields([
  { name: "carImage", maxCount: 1 },
  { name: "carImageId", maxCount: 1 },
  { name: "personIdImage", maxCount: 1 },
  { name: "criminalRecordImage", maxCount: 1 },
  { name: "personSelfy", maxCount: 1 },
]);
