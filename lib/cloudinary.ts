import { createHash } from "node:crypto";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER?.trim() || "instagram";

function createCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

function assertCloudinaryEnv() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Thiếu biến môi trường Cloudinary.");
  }
}

function extractCloudinaryAssetInfo(fileUrl: string): { resourceType: string; publicId: string } | null {
  try {
    const parsed = new URL(fileUrl);
    if (parsed.hostname !== "res.cloudinary.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 5) return null;
    // /<cloud_name>/<resource_type>/upload/<version?>/<public_id>.<ext>
    const resourceType = parts[1];
    if (parts[2] !== "upload") return null;
    const rest = parts.slice(3);
    const versionOffset = /^v\d+$/.test(rest[0] ?? "") ? 1 : 0;
    const idParts = rest.slice(versionOffset);
    if (idParts.length === 0) return null;
    const last = idParts[idParts.length - 1];
    idParts[idParts.length - 1] = last.replace(/\.[^.]+$/, "");
    const publicId = decodeURIComponent(idParts.join("/"));
    if (!publicId) return null;
    return { resourceType, publicId };
  } catch {
    return null;
  }
}

export async function uploadFileToCloudinary(
  file: File
): Promise<{ secureUrl: string; resourceType: string }> {
  assertCloudinaryEnv();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = {
    folder: CLOUDINARY_FOLDER,
    timestamp,
  };
  const signature = createCloudinarySignature(paramsToSign, CLOUDINARY_API_SECRET!);
  const body = new FormData();
  body.append("file", file);
  body.append("folder", CLOUDINARY_FOLDER);
  body.append("timestamp", timestamp);
  body.append("api_key", CLOUDINARY_API_KEY!);
  body.append("signature", signature);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const res = await fetch(url, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    let msg = `Cloudinary upload failed (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: { message?: string } };
      const detail = payload?.error?.message?.trim();
      if (detail) msg = detail;
    } catch {
      // Keep fallback message.
    }
    throw new Error(msg);
  }

  const payload = (await res.json()) as {
    secure_url?: string;
    resource_type?: string;
  };
  if (!payload.secure_url) throw new Error("Cloudinary không trả về URL file.");
  return {
    secureUrl: payload.secure_url,
    resourceType: payload.resource_type ?? "raw",
  };
}

export async function deleteFileFromCloudinary(fileUrl: string): Promise<void> {
  assertCloudinaryEnv();
  const info = extractCloudinaryAssetInfo(fileUrl);
  if (!info) return;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = {
    invalidate: "true",
    public_id: info.publicId,
    timestamp,
  };
  const signature = createCloudinarySignature(paramsToSign, CLOUDINARY_API_SECRET!);
  const body = new FormData();
  body.append("public_id", info.publicId);
  body.append("invalidate", "true");
  body.append("timestamp", timestamp);
  body.append("api_key", CLOUDINARY_API_KEY!);
  body.append("signature", signature);

  const destroyUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${info.resourceType}/destroy`;
  await fetch(destroyUrl, {
    method: "POST",
    body,
  });
}

/** Tạo signed-upload params để client upload trực tiếp lên Cloudinary (bỏ qua server). */
export function generateUploadSignature(): {
  cloudName: string;
  apiKey: string;
  timestamp: string;
  folder: string;
  signature: string;
} {
  assertCloudinaryEnv();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = { folder: CLOUDINARY_FOLDER, timestamp };
  const signature = createCloudinarySignature(paramsToSign, CLOUDINARY_API_SECRET!);
  return {
    cloudName: CLOUDINARY_CLOUD_NAME!,
    apiKey: CLOUDINARY_API_KEY!,
    timestamp,
    folder: CLOUDINARY_FOLDER,
    signature,
  };
}
