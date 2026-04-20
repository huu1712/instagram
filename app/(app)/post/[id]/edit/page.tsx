import { getSessionUserId } from "@/lib/auth";
import { findPostById } from "@/lib/db";
import { redirect } from "next/navigation";
import { EditPostForm } from "./ui";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const post = await findPostById(id);
  if (!post || post.userId !== userId) redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Sửa bài đăng</h1>
        <p className="mt-1 text-sm text-zinc-500">Gỡ media cũ, thêm file mới hoặc đổi chú thích.</p>
      </div>
      <EditPostForm post={post} />
    </div>
  );
}
