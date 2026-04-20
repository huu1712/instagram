import { generateUploadSignature } from "@/lib/cloudinary";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const params = generateUploadSignature();
    return Response.json(params);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi cấu hình Cloudinary.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
