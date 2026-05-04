import { completeMultipartUpload } from "@/lib/storage";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

type MultipartPartPayload = {
  ETag?: string;
  PartNumber?: number;
};

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      objectKey?: string;
      uploadId?: string;
      parts?: MultipartPartPayload[];
    };
    const objectKey = String(payload.objectKey ?? "").trim();
    const uploadId = String(payload.uploadId ?? "").trim();
    const parts = Array.isArray(payload.parts) ? payload.parts : [];

    if (!objectKey || !uploadId || parts.length === 0) {
      return Response.json({ error: "Thiếu dữ liệu để hoàn tất multipart upload." }, { status: 400 });
    }

    const normalizedParts = parts
      .map((part) => ({
        ETag: String(part.ETag ?? "").trim(),
        PartNumber: Number(part.PartNumber ?? 0),
      }))
      .filter((part) => part.ETag && Number.isInteger(part.PartNumber) && part.PartNumber > 0)
      .sort((a, b) => a.PartNumber - b.PartNumber);

    if (normalizedParts.length === 0) {
      return Response.json({ error: "Danh sách parts không hợp lệ." }, { status: 400 });
    }

    const result = await completeMultipartUpload({
      objectKey,
      uploadId,
      parts: normalizedParts,
    });

    return Response.json({ fileUrl: result.fileUrl, objectKey });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hoàn tất multipart upload.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
