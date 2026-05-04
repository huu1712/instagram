import { generateMultipartPartUploadUrl } from "@/lib/storage";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      objectKey?: string;
      uploadId?: string;
      partNumber?: number;
    };
    const objectKey = String(payload.objectKey ?? "").trim();
    const uploadId = String(payload.uploadId ?? "").trim();
    const partNumber = Number(payload.partNumber ?? 0);

    if (!objectKey || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
      return Response.json({ error: "Thông tin part upload không hợp lệ." }, { status: 400 });
    }

    const params = await generateMultipartPartUploadUrl(objectKey, uploadId, partNumber);
    return Response.json(params);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi tạo URL upload part.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
