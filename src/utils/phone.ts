import { AppError } from "../middleware/error.middleware.js";

/** Egyptian mobile in E.164, e.g. +201012345678 */
const E164_EG = /^\+201[0-9]{9}$/;

/** Digits only after stripping country code prefix */
function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Normalize Egyptian phone input to E.164 (+20…).
 * Accepts 01xxxxxxxxx, +20…, 0020…, spaces.
 */
export function normalizeEgyptPhone(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw new AppError("phone is required", 400);
  }

  let digits = onlyDigits(raw);

  if (digits.startsWith("20") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 && digits.startsWith("1")) {
    return `+20${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("201")) {
    return `+${digits}`;
  }

  throw new AppError(
    "Invalid Egyptian phone number. Use format 01xxxxxxxxx or +20…",
    400,
    "INVALID_PHONE",
  );
}

export function assertValidEgyptE164(phone: string): void {
  if (!E164_EG.test(phone)) {
    throw new AppError(
      "Invalid Egyptian phone number after normalization",
      400,
      "INVALID_PHONE",
    );
  }
}
