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

  const sorted = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-full border border-white/12 bg-zinc-950/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("list")}
            className={`rounded-full px-3 py-1.5 transition ${
              mode === "list" ? "bg-white/14 text-white" : "text-zinc-300 hover:bg-white/8"
            }`}
          >
            Dạng list
          </button>
          <button
            type="button"
            onClick={() => setMode("grid")}
            className={`rounded-full px-3 py-1.5 transition ${
              mode === "grid" ? "bg-white/14 text-white" : "text-zinc-300 hover:bg-white/8"
            }`}
          >
            Dạng lưới
          </button>
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
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sorted.map((item) => {
            const preview = item.post.media[0];
            return (
              <li key={item.post.id}>
                <Link
                  href={`/post/${item.post.id}`}
                  className="group block overflow-hidden rounded-lg border border-white/10 bg-zinc-950/80"
                >
                  <div className="relative aspect-square w-full bg-black">
                    {preview?.kind === "video" ? (
                      <video src={preview.url} className="h-full w-full object-cover transition group-hover:scale-[1.02]" muted />
                    ) : preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview.url}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : null}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="truncate text-xs font-medium text-zinc-100">{item.authorName}</p>
                    <p className="mt-0.5 min-h-[2.25rem] line-clamp-2 text-[11px] leading-[1.125rem] text-zinc-400">
                      {item.post.caption || "\u00A0"}
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
