"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Post } from "@/lib/db";
import { PostCard } from "@/app/components/PostCard";

type FeedItem = {
  post: Post;
  authorName: string;
  authorAvatar: string | null;
  isOwner: boolean;
};

export function FeedSwitcher({ items }: { items: FeedItem[] }) {
  const [mode, setMode] = useState<"list" | "grid">("list");
  const [sortByDate, setSortByDate] = useState<"newest" | "oldest">("newest");

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.post.pinned !== b.post.pinned) return a.post.pinned ? -1 : 1;
        const diff =
          new Date(a.post.createdAt).getTime() - new Date(b.post.createdAt).getTime();
        return sortByDate === "newest" ? -diff : diff;
      }),
    [items, sortByDate]
  );

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/65 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Bộ lọc bảng tin</p>
            <p className="text-xs text-zinc-500">Bài ghim luôn được giữ ở đầu danh sách.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSortByDate("newest")}
                className={`rounded-full px-3.5 py-2 font-medium transition ${
                  sortByDate === "newest"
                    ? "bg-white text-zinc-950 shadow-[0_10px_25px_rgba(255,255,255,0.16)]"
                    : "text-zinc-300 hover:bg-white/8"
                }`}
              >
                Mới nhất
              </button>
              <button
                type="button"
                onClick={() => setSortByDate("oldest")}
                className={`rounded-full px-3.5 py-2 font-medium transition ${
                  sortByDate === "oldest"
                    ? "bg-white text-zinc-950 shadow-[0_10px_25px_rgba(255,255,255,0.16)]"
                    : "text-zinc-300 hover:bg-white/8"
                }`}
              >
                Cũ nhất
              </button>
            </div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("list")}
                className={`rounded-full px-3.5 py-2 font-medium transition ${
                  mode === "list"
                    ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-zinc-950 shadow-[0_10px_30px_rgba(56,189,248,0.32)]"
                    : "text-zinc-300 hover:bg-white/8"
                }`}
              >
                Dạng list
              </button>
              <button
                type="button"
                onClick={() => setMode("grid")}
                className={`rounded-full px-3.5 py-2 font-medium transition ${
                  mode === "grid"
                    ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-zinc-950 shadow-[0_10px_30px_rgba(56,189,248,0.32)]"
                    : "text-zinc-300 hover:bg-white/8"
                }`}
              >
                Dạng lưới
              </button>
            </div>
          </div>
        </div>
      </div>

      {mode === "list" ? (
        <ul className="space-y-5">
          {sorted.map((item) => (
            <PostCard
              key={item.post.id}
              post={item.post}
              authorName={item.authorName}
              authorAvatar={item.authorAvatar}
              isOwner={item.isOwner}
            />
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((item) => {
            const preview = item.post.media[0];
            return (
              <li key={item.post.id}>
                <Link
                  href={`/post/${item.post.id}`}
                  className="group block overflow-hidden rounded-[1.35rem] border border-white/10 bg-zinc-950/85 shadow-[0_22px_60px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-white/15"
                >
                  <div className="relative aspect-square w-full bg-black">
                    {item.post.pinned ? (
                      <span className="absolute left-3 top-3 z-10 rounded-full border border-amber-300/25 bg-amber-400/90 px-2.5 py-1 text-[10px] font-semibold text-zinc-950 shadow-lg shadow-amber-500/25">
                        Ghim
                      </span>
                    ) : null}
                    {preview?.kind === "video" ? (
                      <span className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                        Video
                      </span>
                    ) : null}
                    <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-70 transition group-hover:opacity-90" />
                    {preview?.kind === "video" ? (
                      <video src={preview.url} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" muted />
                    ) : preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview.url}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 z-[2] p-3">
                      <p className="truncate text-xs font-semibold text-white/95">{item.authorName}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 px-3 py-3">
                    <p className="min-h-[2.5rem] line-clamp-2 text-xs leading-5 text-zinc-200">
                      {item.post.caption || "\u00A0"}
                    </p>
                    <p className="text-[11px] font-medium text-zinc-500">
                      {new Date(item.post.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
