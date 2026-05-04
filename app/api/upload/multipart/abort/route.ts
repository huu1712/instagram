import { abortMultipartUpload } from "@/lib/storage";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { objectKey?: string; uploadId?: string };
    const objectKey = String(payload.objectKey ?? "").trim();
    const uploadId = String(payload.uploadId ?? "").trim();

    if (!objectKey || !uploadId) {
      return Response.json({ error: "Thiếu objectKey hoặc uploadId." }, { status: 400 });
    }

    await abortMultipartUpload({ objectKey, uploadId });
    return Response.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi huỷ multipart upload.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
