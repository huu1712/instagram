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
    xhr.onerror = () => reject(new Error("Lỗi kết nối khi upload."));
    xhr.send(file);
  });
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

      try {
        await uploadWithProgress(sign.uploadUrl, file, file.type || "application/octet-stream", (pct) => {
          setProgresses((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, percent: pct } : p))
          );
        });
        setProgresses((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, percent: 100, done: true } : p))
        );
        results.push({
          url: sign.fileUrl,
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
