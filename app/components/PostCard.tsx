"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/db";
import { deletePostAction, togglePostPinnedAction, type ActionState } from "@/lib/actions";
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
  const pinFormRef = useRef<HTMLFormElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();
  const [awaitingInteraction, setAwaitingInteraction] = useState(false);
  const [delState, delAction, delPending] = useActionState(deletePostAction, delInitial);
  const [pinState, pinAction, pinPending] = useActionState(togglePostPinnedAction, {});

  useEffect(() => {
    if (delState.error) {
      alert(delState.error);
    }
  }, [delState.error]);

  useEffect(() => {
    if (pinState.error) {
      alert(pinState.error);
      return;
    }
    if (pinState.ok) {
      router.refresh();
    }
  }, [pinState.error, pinState.ok, router]);

  function confirmDelete() {
    if (!confirm("Xóa bài đăng này? Hành động không hoàn tác.")) return;
    formRef.current?.requestSubmit();
  }

  function togglePin() {
    pinFormRef.current?.requestSubmit();
  }

  function markAutoplayIntent() {
    if (!autoPlayMusic || typeof window === "undefined") return;
    sessionStorage.setItem("gram-autoplay-intent", post.id);
  }

  async function handleOverlayPlay() {
    const el = audioRef.current;
    if (!el) return;
    try {
      await el.play();
      setAwaitingInteraction(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("gram-autoplay-intent");
      }
    } catch {
      setAwaitingInteraction(true);
    }
  }

  useEffect(() => {
    if (!showMusic || !post.music || !autoPlayMusic) return;
    const el = audioRef.current;
    if (!el) return;

    let cancelled = false;

    const tryPlay = async () => {
      try {
        await el.play();
        if (!cancelled) {
          setAwaitingInteraction(false);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("gram-autoplay-intent");
          }
        }
      } catch {
        if (!cancelled) setAwaitingInteraction(true);
      }
    };

    void tryPlay();

    const hasIntent =
      typeof window !== "undefined" &&
      sessionStorage.getItem("gram-autoplay-intent") === post.id;

    if (hasIntent) {
      const retryOnPageReady = () => {
        void tryPlay();
      };

      window.addEventListener("pageshow", retryOnPageReady);
      window.addEventListener("focus", retryOnPageReady);
      document.addEventListener("visibilitychange", retryOnPageReady);

      return () => {
        cancelled = true;
        window.removeEventListener("pageshow", retryOnPageReady);
        window.removeEventListener("focus", retryOnPageReady);
        document.removeEventListener("visibilitychange", retryOnPageReady);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [autoPlayMusic, post.id, post.music, showMusic]);

  useEffect(() => {
    if (!awaitingInteraction || !showMusic || !post.music || !autoPlayMusic) return;

    const resumePlayback = async () => {
      const el = audioRef.current;
      if (!el) return;
      try {
        await el.play();
        setAwaitingInteraction(false);
      } catch {
        // Keep waiting for another user interaction.
      }
    };

    const handleInteraction = () => {
      void resumePlayback();
    };

    document.addEventListener("pointerdown", handleInteraction, { passive: true });
    document.addEventListener("keydown", handleInteraction);

    return () => {
      document.removeEventListener("pointerdown", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [autoPlayMusic, awaitingInteraction, post.music, showMusic]);

  return (
    <li className="mx-auto w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/78 shadow-[0_26px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="border-b border-white/6 bg-gradient-to-r from-white/[0.05] to-transparent px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-zinc-800 ring-1 ring-white/10">
          {authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={authorAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
              {authorName.slice(0, 1).toUpperCase()}
            </div>
          )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-white">{authorName}</p>
              {post.pinned ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-400/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                  Ghim
                </span>
              ) : null}
              {post.media.length > 1 ? (
                <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-300">
                  {post.media.length} media
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span>{timeAgo(post.createdAt)}</span>
              <span>{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
            </div>
          </div>
          {isOwner ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <form ref={pinFormRef} action={pinAction} className="inline">
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="pinned" value={post.pinned ? "false" : "true"} />
                <button
                  type="button"
                  disabled={pinPending}
                  onClick={togglePin}
                  className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-400/16 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {pinPending ? (
                      <span className="h-3 w-3 animate-spin rounded-full border border-amber-300/40 border-t-amber-300" />
                    ) : null}
                    {pinPending ? "Đang lưu..." : post.pinned ? "Bỏ ghim" : "Ghim"}
                  </span>
                </button>
              </form>
              <Link
                href={`/post/${post.id}/edit`}
                className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:bg-sky-400/16"
              >
                Sửa
              </Link>
              <form ref={formRef} action={delAction} className="inline">
                <input type="hidden" name="postId" value={post.id} />
                <button
                  type="button"
                  disabled={delPending}
                  onClick={confirmDelete}
                  className="rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-400/16 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {delPending ? (
                      <span className="h-3 w-3 animate-spin rounded-full border border-red-300/40 border-t-red-300" />
                    ) : null}
                    {delPending ? "Đang xóa..." : "Xóa"}
                  </span>
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
      <MediaCarousel media={post.media} />
      {post.caption ? (
        <div className="border-t border-white/6 px-4 py-4">
          <p
            className={`text-sm leading-6 break-words text-zinc-200 ${
              showDetailLink ? "line-clamp-2" : "whitespace-pre-wrap"
            }`}
          >
            <span className="mr-2 font-semibold text-white">{authorName}</span>
            {post.caption}
          </p>
        </div>
      ) : null}
      {showMusic && post.music ? (
        <div className="border-t border-white/6 px-4 py-4">
          <div className="relative rounded-[1.4rem] border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-sky-500/10 p-4">
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
              controls={!(awaitingInteraction && autoPlayMusic)}
              autoPlay={autoPlayMusic}
              className={`w-full ${awaitingInteraction && autoPlayMusic ? "pointer-events-none opacity-70" : ""}`}
              preload={autoPlayMusic ? "auto" : "metadata"}
            />
            {awaitingInteraction && autoPlayMusic ? (
              <button
                type="button"
                onClick={() => void handleOverlayPlay()}
                className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.4rem] bg-black/42 backdrop-blur-[2px]"
              >
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-black/20">
                  Chạm để phát nhạc
                </span>
              </button>
            ) : null}
            <p className="mt-2 text-xs text-zinc-400">
              {awaitingInteraction && autoPlayMusic
                ? "Trình duyệt đang chặn autoplay. Chạm vào khung nhạc để phát ngay."
                : autoPlayMusic
                  ? "Đang cố tự phát nhạc khi mở chi tiết bài viết."
                  : "Nhấn play để nghe nhạc nền cho bài viết này."}
            </p>
          </div>
        </div>
      ) : null}
      {showDetailLink ? (
        <div className="border-t border-white/6 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Mở để xem media và nhạc đầy đủ.</p>
            <Link
              href={`/post/${post.id}`}
              onClick={markAutoplayIntent}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
            >
              Xem chi tiết
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      ) : null}
    </li>
  );
}
