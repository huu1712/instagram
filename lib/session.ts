const encoder = new TextEncoder();

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

export async function createSessionToken(
  userId: string,
  secret: string,
  maxAgeMs: number
): Promise<string> {
  const exp = Date.now() + maxAgeMs;
  const payload = `${userId}:${exp}`;
  const sig = await hmacSha256Hex(secret, payload);
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<string | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sigHex = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = await hmacSha256Hex(secret, payload);
  if (!timingSafeEqual(expected, sigHex)) return null;
  const colon = payload.lastIndexOf(":");
  if (colon === -1) return null;
  const userId = payload.slice(0, colon);
  const exp = Number(payload.slice(colon + 1));
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  return userId;
}

export const SESSION_COOKIE = "ig_session";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-change-in-production";
}
