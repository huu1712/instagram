import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { getPosts, findUserById } from "@/lib/db";
import { FeedSwitcher } from "@/app/components/FeedSwitcher";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const posts = await getPosts();
  const me = await getSessionUserId();
  const items = await Promise.all(
    posts.map(async (post) => {
      const author = await findUserById(post.userId);
      return {
        post,
        authorName: author?.displayName ?? "Ẩn danh",
        authorAvatar: author?.avatarUrl ?? null,
        isOwner: me != null && me === post.userId,
      };
    })
  );

  return (
    <div className="space-y-4">
      <h1 className="">Bảng tin</h1>
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center text-zinc-400">
          Chưa có bài đăng. Hãy{" "}
          <Link href="/post/new" className="text-sky-400 hover:underline">
            đăng ảnh hoặc video đầu tiên
          </Link>
          .
        </div>
      ) : (
        <FeedSwitcher items={items} />
      )}
    </div>
  );
}
