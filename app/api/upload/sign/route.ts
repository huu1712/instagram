import { generatePresignedUpload } from "@/lib/storage";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { fileName?: string; contentType?: string };
    const fileName = String(payload.fileName ?? "").trim();
    const contentType = String(payload.contentType ?? "").trim();

    if (!fileName || !contentType) {
      return Response.json({ error: "Thiếu thông tin file để upload." }, { status: 400 });
    }

    const params = await generatePresignedUpload(fileName, contentType);
    return Response.json(params);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi cấu hình Cloudflare R2.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
