import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;

export function hashPassword(plain: string): { salt: string; hash: string } {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LEN).toString("hex");
  return { salt, hash };
}

export function verifyPassword(plain: string, salt: string, hash: string): boolean {
  try {
    const derived = scryptSync(plain, salt, KEY_LEN);
    const expected = Buffer.from(hash, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
