import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME?.trim();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim()?.replace(/\/+$/, "");
const R2_PREFIX = process.env.R2_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || "instagram";

function assertR2Env() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    throw new Error("Thiếu biến môi trường Cloudflare R2.");
  }
}

function getR2Client() {
  assertR2Env();
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName).replace(/[^\w.-]+/g, "-");
  return baseName || "upload";
}

function buildObjectKey(fileName: string) {
  const safeName = sanitizeFileName(fileName);
  return `${R2_PREFIX}/${randomUUID()}-${safeName}`;
}

function buildPublicFileUrl(objectKey: string) {
  assertR2Env();
  return `${R2_PUBLIC_URL}/${objectKey}`;
}

export function isManagedUploadUrl(fileUrl: string) {
  return Boolean(R2_PUBLIC_URL && fileUrl.startsWith(`${R2_PUBLIC_URL}/`));
}

export function isValidManagedFileUrl(fileUrl: string) {
  if (!isManagedUploadUrl(fileUrl)) return false;
  try {
    const parsed = new URL(fileUrl);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function extractObjectKey(fileUrl: string) {
  if (!isManagedUploadUrl(fileUrl)) return null;
  try {
    const parsed = new URL(fileUrl);
    const publicPath = new URL(`${R2_PUBLIC_URL}/`).pathname.replace(/\/+$/, "");
    const filePath = parsed.pathname;
    if (!filePath.startsWith(`${publicPath}/`)) return null;
    const objectKey = decodeURIComponent(filePath.slice(publicPath.length + 1));
    return objectKey || null;
  } catch {
    return null;
  }
}

export async function generatePresignedUpload(fileName: string, contentType: string) {
  assertR2Env();
  const objectKey = buildObjectKey(fileName);
  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: objectKey,
      ContentType: contentType,
    }),
    // Large files can take longer on unstable networks.
    { expiresIn: 60 * 30 }
  );

  return {
    uploadUrl,
    fileUrl: buildPublicFileUrl(objectKey),
    objectKey,
  };
}

export async function createMultipartUpload(fileName: string, contentType: string) {
  assertR2Env();
  const objectKey = buildObjectKey(fileName);
  const client = getR2Client();
  const output = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: objectKey,
      ContentType: contentType,
    })
  );

  if (!output.UploadId) {
    throw new Error("Không thể khởi tạo multipart upload.");
  }

  return {
    objectKey,
    uploadId: output.UploadId,
    fileUrl: buildPublicFileUrl(objectKey),
  };
}

export async function generateMultipartPartUploadUrl(
  objectKey: string,
  uploadId: string,
  partNumber: number
) {
  assertR2Env();
  if (!objectKey || !uploadId) {
    throw new Error("Thiếu objectKey hoặc uploadId.");
  }
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
    throw new Error("partNumber không hợp lệ.");
  }

  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new UploadPartCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: objectKey,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: 60 * 30 }
  );

  return { uploadUrl };
}

export async function completeMultipartUpload(params: {
  objectKey: string;
  uploadId: string;
  parts: CompletedPart[];
}) {
  const { objectKey, uploadId, parts } = params;
  assertR2Env();

  if (!objectKey || !uploadId) {
    throw new Error("Thiếu objectKey hoặc uploadId.");
  }
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Thiếu danh sách parts để hoàn tất upload.");
  }

  await getR2Client().send(
    new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: objectKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .map((part) => ({ ETag: part.ETag, PartNumber: part.PartNumber }))
          .filter((part): part is Required<Pick<CompletedPart, "ETag" | "PartNumber">> => {
            return Boolean(part.ETag && part.PartNumber);
          }),
      },
    })
  );

  return { fileUrl: buildPublicFileUrl(objectKey) };
}

export async function abortMultipartUpload(params: { objectKey: string; uploadId: string }) {
  const { objectKey, uploadId } = params;
  assertR2Env();
  if (!objectKey || !uploadId) return;

  await getR2Client().send(
    new AbortMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: objectKey,
      UploadId: uploadId,
    })
  );
}

export async function deleteManagedFile(fileUrl: string): Promise<void> {
  const objectKey = extractObjectKey(fileUrl);
  if (!objectKey) return;

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: objectKey,
    })
  );
}
