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
  cloudName: string;
  apiKey: string;
  timestamp: string;
  folder: string;
  signature: string;
  error?: string;
};

function mimeToKind(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

async function fetchSignature(): Promise<SignResponse> {
  const res = await fetch("/api/upload/sign");
  if (!res.ok) throw new Error("Không lấy được thông tin upload.");
  return res.json() as Promise<SignResponse>;
}

function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (pct: number) => void
): Promise<{ secure_url: string; resource_type: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as { secure_url: string; resource_type: string });
        } catch {
          reject(new Error("Cloudinary trả về dữ liệu không hợp lệ."));
        }
      } else {
        let msg = `Upload thất bại (${xhr.status})`;
        try {
          const payload = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          if (payload?.error?.message) msg = payload.error.message;
        } catch { /* ignore */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Lỗi kết nối khi upload."));
    xhr.send(body);
  });
}

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;

export function useCloudinaryUpload() {
  const [progresses, setProgresses] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(async (files: File[]): Promise<{ ok: UploadedMedia[] } | { error: string }> => {
    if (files.length === 0) return { ok: [] };

    // Validate trước
    for (const f of files) {
      const kind = mimeToKind(f.type);
      if (!kind) return { error: `File "${f.name}" không phải ảnh hoặc video.` };
      const max = kind === "image" ? MAX_IMAGE : MAX_VIDEO;
      if (f.size > max) {
        return { error: kind === "image" ? `"${f.name}": Ảnh tối đa 5MB.` : `"${f.name}": Video tối đa 40MB.` };
      }
    }

    setUploading(true);
    setProgresses(files.map((f) => ({ name: f.name, percent: 0, done: false })));

    let sign: SignResponse;
    try {
      sign = await fetchSignature();
      if (sign.error) return { error: sign.error };
    } catch (e) {
      setUploading(false);
      return { error: e instanceof Error ? e.message : "Không lấy được chữ ký upload." };
    }

    const results: UploadedMedia[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const kind = mimeToKind(file.type)!;

      const body = new FormData();
      body.append("file", file);
      body.append("folder", sign.folder);
      body.append("timestamp", sign.timestamp);
      body.append("api_key", sign.apiKey);
      body.append("signature", sign.signature);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`;

      try {
        const payload = await uploadWithProgress(uploadUrl, body, (pct) => {
          setProgresses((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, percent: pct } : p))
          );
        });
        setProgresses((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, percent: 100, done: true } : p))
        );
        results.push({
          url: payload.secure_url,
          kind: payload.resource_type === "image" || kind === "image" ? "image" : "video",
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
