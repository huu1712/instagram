"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/db";
import { deletePostAction, type ActionState } from "@/lib/actions";
import { MediaCarousel } from "./MediaCarousel";

function timeAgo(iso: string) {
  const t = Date.now() - new Date(iso).getTime();
  const m = Math.floor(t / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  return `${Math.floor(h / 24)} ngày`;
}

const delInitial: ActionState = {};

export function PostCard({
  post,
  authorName,
  authorAvatar,
  isOwner,
  showDetailLink = true,
  showMusic = false,
  autoPlayMusic = false,
}: {
  post: Post;
  authorName: string;
  authorAvatar: string | null;
  isOwner: boolean;
  showDetailLink?: boolean;
  showMusic?: boolean;
  autoPlayMusic?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [delState, delAction, delPending] = useActionState(deletePostAction, delInitial);

  useEffect(() => {
    if (delState.error) {
      alert(delState.error);
    }
  }, [delState.error]);

  function confirmDelete() {
    if (!confirm("Xóa bài đăng này? Hành động không hoàn tác.")) return;
    formRef.current?.requestSubmit();
  }

  useEffect(() => {
    if (!showMusic || !post.music || !autoPlayMusic) return;
    const el = audioRef.current;
    if (!el) return;
    let cancelled = false;
    const playback = el.play();
    if (playback && typeof playback.then === "function") {
      playback.then(() => {
        if (!cancelled) setAutoplayBlocked(false);
      }).catch(() => {
        if (!cancelled) setAutoplayBlocked(true);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [autoPlayMusic, post.id, post.music, showMusic]);

  async function handleManualPlay() {
    const el = audioRef.current;
    if (!el) return;
    try {
      await el.play();
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/75 shadow-lg shadow-black/30 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/10">
          {authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={authorAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500">
              {authorName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{authorName}</p>
          <p className="text-xs text-zinc-500">{timeAgo(post.createdAt)}</p>
        </div>
        {isOwner ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={`/post/${post.id}/edit`}
              className="rounded-full px-2 py-1 text-xs font-medium text-sky-300 hover:bg-white/8"
            >
              Sửa
            </Link>
            <form ref={formRef} action={delAction} className="inline">
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="button"
                disabled={delPending}
                onClick={confirmDelete}
                className="rounded-full px-2 py-1 text-xs font-medium text-red-300 hover:bg-white/8 disabled:opacity-50"
              >
                {delPending ? "Đang xóa…" : "Xóa"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
      <MediaCarousel media={post.media} />
      {post.caption ? (
        <div className="border-t border-white/5 px-3 py-2.5">
          <p
            className={`text-sm break-words text-zinc-200 ${
              showDetailLink ? "line-clamp-2" : "whitespace-pre-wrap"
            }`}
          >
            <span className="mr-2 font-semibold text-white">{authorName}</span>
            {post.caption}
          </p>
        </div>
      ) : null}
      {showMusic && post.music ? (
        <div className="border-t border-white/5 px-3 py-3">
          <div className="rounded-xl border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-sky-500/10 p-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-200/80">
                  Nhạc nền
                </p>
                <p className="truncate text-sm font-semibold text-white">{post.music.title}</p>
                <p className="truncate text-xs text-zinc-300">
                  {post.music.artist || "Unknown artist"}
                </p>
              </div>
              <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                {post.music.provider === "deezer" ? "Deezer" : "Upload"}
              </span>
            </div>
            <audio
              ref={audioRef}
              src={post.music.url}
              controls={!autoPlayMusic}
              autoPlay={autoPlayMusic}
              className="w-full"
              preload="metadata"
            />
            {autoplayBlocked && autoPlayMusic ? (
              <button
                type="button"
                onClick={handleManualPlay}
                className="mt-2 text-xs font-medium text-sky-300 hover:text-sky-200"
              >
                Trình duyệt đã chặn autoplay. Nhấn để phát nhạc.
              </button>
            ) : null}
            {autoPlayMusic ? (
              <p className="mt-2 text-xs text-zinc-400">
                Nhạc đang phát tự động ở nền.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {showDetailLink ? (
        <div className="border-t border-white/5 px-3 py-2 text-right">
          <Link href={`/post/${post.id}`} className="text-xs font-medium text-zinc-300 hover:text-white">
            Xem chi tiết
          </Link>
        </div>
      ) : null}
    </li>
  );
}
