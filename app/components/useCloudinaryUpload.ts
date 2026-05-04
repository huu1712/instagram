"use client";

import { useState, useCallback } from "react";

export type UploadedMedia = {
  url: string;
  kind: "image" | "video";
};

type UploadProgress = {
  name: string;
  percent: number; // 0-100
  done: boolean;
  error?: string;
};

type SignResponse = {
  uploadUrl: string;
  fileUrl: string;
  objectKey: string;
  error?: string;
};

type MultipartStartResponse = {
  objectKey: string;
  uploadId: string;
  fileUrl: string;
  error?: string;
};

type MultipartPartUrlResponse = {
  uploadUrl: string;
  error?: string;
};

type MultipartCompleteResponse = {
  fileUrl: string;
  objectKey: string;
  error?: string;
};

type UploadedPart = {
  ETag: string;
  PartNumber: number;
};

const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024; // 100 MB
const MULTIPART_PART_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB (>= 5MB min S3 part size)

function mimeToKind(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

async function fetchSignature(file: File): Promise<SignResponse> {
  const res = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!res.ok) throw new Error("Không lấy được thông tin upload.");
  return res.json() as Promise<SignResponse>;
}

async function startMultipartUpload(file: File): Promise<MultipartStartResponse> {
  const res = await fetch("/api/upload/multipart/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!res.ok) throw new Error("Không khởi tạo được multipart upload.");
  return res.json() as Promise<MultipartStartResponse>;
}

async function getMultipartPartUploadUrl(
  objectKey: string,
  uploadId: string,
  partNumber: number
): Promise<MultipartPartUrlResponse> {
  const res = await fetch("/api/upload/multipart/part", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectKey, uploadId, partNumber }),
  });
  if (!res.ok) throw new Error(`Không lấy được URL upload cho part #${partNumber}.`);
  return res.json() as Promise<MultipartPartUrlResponse>;
}

async function completeMultipart(
  objectKey: string,
  uploadId: string,
  parts: UploadedPart[]
): Promise<MultipartCompleteResponse> {
  const res = await fetch("/api/upload/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectKey, uploadId, parts }),
  });
  if (!res.ok) throw new Error("Không thể hoàn tất multipart upload.");
  return res.json() as Promise<MultipartCompleteResponse>;
}

async function abortMultipart(objectKey: string, uploadId: string): Promise<void> {
  try {
    await fetch("/api/upload/multipart/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectKey, uploadId }),
    });
  } catch {
    // Ignore abort failures on client side.
  }
}

function uploadWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload thất bại (${xhr.status})`));
      }
    };
    xhr.onerror = () => {
      // Most common cause here is CORS (blocked preflight) when uploading directly to R2.
      reject(new Error("Lỗi kết nối khi upload. (Có thể do CORS Cloudflare R2)"));
    };
    xhr.send(file);
  });
}

function uploadPartWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress: (loadedBytes: number) => void
): Promise<{ etag: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      onProgress(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("Không đọc được ETag của part upload."));
          return;
        }
        resolve({ etag });
      } else {
        reject(new Error(`Upload part thất bại (${xhr.status})`));
      }
    };
    xhr.onerror = () => {
      reject(new Error("Lỗi kết nối khi upload part."));
    };
    xhr.send(blob);
  });
}

async function uploadLargeFileWithMultipart(
  file: File,
  onProgress: (pct: number) => void
): Promise<{ fileUrl: string }> {
  const start = await startMultipartUpload(file);
  if (start.error) throw new Error(start.error);

  const totalSize = file.size;
  const totalParts = Math.max(1, Math.ceil(totalSize / MULTIPART_PART_SIZE_BYTES));
  const uploadedParts: UploadedPart[] = [];

  try {
    let uploadedBaseBytes = 0;

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const startByte = (partNumber - 1) * MULTIPART_PART_SIZE_BYTES;
      const endByte = Math.min(startByte + MULTIPART_PART_SIZE_BYTES, totalSize);
      const partBlob = file.slice(startByte, endByte);

      const partUrl = await getMultipartPartUploadUrl(start.objectKey, start.uploadId, partNumber);
      if (partUrl.error) throw new Error(partUrl.error);

      const { etag } = await uploadPartWithProgress(
        partUrl.uploadUrl,
        partBlob,
        file.type || "application/octet-stream",
        (partLoadedBytes) => {
          const loaded = uploadedBaseBytes + Math.min(partLoadedBytes, partBlob.size);
          const pct = Math.round((loaded / totalSize) * 100);
          onProgress(pct);
        }
      );

      uploadedParts.push({ ETag: etag, PartNumber: partNumber });
      uploadedBaseBytes += partBlob.size;
      onProgress(Math.round((uploadedBaseBytes / totalSize) * 100));
    }

    const done = await completeMultipart(start.objectKey, start.uploadId, uploadedParts);
    if (done.error) throw new Error(done.error);
    return { fileUrl: done.fileUrl };
  } catch (error) {
    await abortMultipart(start.objectKey, start.uploadId);
    throw error;
  }
}

export function useCloudinaryUpload() {
  const [progresses, setProgresses] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(async (files: File[]): Promise<{ ok: UploadedMedia[] } | { error: string }> => {
    if (files.length === 0) return { ok: [] };

    // Validate trước
    for (const f of files) {
      const kind = mimeToKind(f.type);
      if (!kind) return { error: `File "${f.name}" không phải ảnh hoặc video.` };
    }

    setUploading(true);
    setProgresses(files.map((f) => ({ name: f.name, percent: 0, done: false })));

    const results: UploadedMedia[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const kind = mimeToKind(file.type)!;
      const shouldUseMultipart = kind === "video" && file.size >= MULTIPART_THRESHOLD_BYTES;
      let uploadedFileUrl = "";

      try {
        if (shouldUseMultipart) {
          const multipartResult = await uploadLargeFileWithMultipart(file, (pct) => {
            setProgresses((prev) => prev.map((p, idx) => (idx === i ? { ...p, percent: pct } : p)));
          });
          uploadedFileUrl = multipartResult.fileUrl;
        } else {
          let sign: SignResponse;
          try {
            sign = await fetchSignature(file);
            if (sign.error) {
              setUploading(false);
              return { error: sign.error };
            }
          } catch (e) {
            setUploading(false);
            return { error: e instanceof Error ? e.message : "Không lấy được URL upload." };
          }

          await uploadWithProgress(sign.uploadUrl, file, file.type || "application/octet-stream", (pct) => {
            setProgresses((prev) =>
              prev.map((p, idx) => (idx === i ? { ...p, percent: pct } : p))
            );
          });
          uploadedFileUrl = sign.fileUrl;
        }
        setProgresses((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, percent: 100, done: true } : p))
        );
        results.push({
          url: uploadedFileUrl,
          kind,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload thất bại.";
        setProgresses((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, error: msg } : p))
        );
        setUploading(false);
        return { error: `"${file.name}": ${msg}` };
      }
    }

    setUploading(false);
    return { ok: results };
  }, []);

  const reset = useCallback(() => {
    setProgresses([]);
    setUploading(false);
  }, []);

  return { uploadFiles, uploading, progresses, reset };
}
