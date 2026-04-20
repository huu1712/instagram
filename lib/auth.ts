import { cookies } from "next/headers";
import {
  createSessionToken,
  getAuthSecret,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  verifySessionToken,
} from "@/lib/session";

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, getAuthSecret());
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies();
  const token = await createSessionToken(userId, getAuthSecret(), SESSION_MAX_AGE_MS);
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
