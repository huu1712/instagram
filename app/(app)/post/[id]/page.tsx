import Link from "next/link";
import { redirect } from "next/navigation";
import { PostCard } from "@/app/components/PostCard";
import { getSessionUserId } from "@/lib/auth";
import { findPostById, findUserById } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const post = await findPostById(id);
  if (!post) redirect("/");

  const author = await findUserById(post.userId);
  const authorName = author?.displayName ?? "Ẩn danh";
  const authorAvatar = author?.avatarUrl ?? null;
  const isOwner = post.userId === userId;

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex text-sm text-zinc-400 hover:text-white">
        ← Quay lại bảng tin
      </Link>
      <ul>
        <PostCard
          post={post}
          authorName={authorName}
          authorAvatar={authorAvatar}
          isOwner={isOwner}
          showDetailLink={false}
          showMusic
          autoPlayMusic
        />
      </ul>
    </div>
  );
}
