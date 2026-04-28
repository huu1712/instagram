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

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PostCard({
  post,
  authorName,
  authorAvatar,
  isOwner,
  showDetailLink = true,
  showMusic = false,
}: {
  post: Post;
  authorName: string;
  authorAvatar: string | null;
  isOwner: boolean;
  showDetailLink?: boolean;
  showMusic?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const pinFormRef = useRef<HTMLFormElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  async function toggleAudioPlayback() {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
      } else {
        el.pause();
      }
    } catch {
      setIsPlaying(false);
    }
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !showMusic || !post.music) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => setDuration(el.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("ended", onEnded);
    };
  }, [post.id, post.music, showMusic]);

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
          <div className="rounded-[1.4rem] border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-sky-500/10 p-4">
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
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void toggleAudioPlayback()}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-purple-500 to-sky-500 text-white shadow-lg shadow-fuchsia-950/30 transition hover:brightness-110"
                  aria-label={isPlaying ? "Tạm dừng nhạc" : "Phát nhạc"}
                >
                  {isPlaying ? (
                    <span className="flex gap-1">
                      <span className="h-4 w-1 rounded-full bg-white" />
                      <span className="h-4 w-1 rounded-full bg-white" />
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="ml-0.5 h-0 w-0 border-y-[8px] border-y-transparent border-l-[13px] border-l-white"
                    />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <p className="truncate text-sm font-medium text-white">
                        {isPlaying ? "Đang phát nhạc" : "Sẵn sàng phát nhạc"}
                      </p>
                      <div className="music-waveform" data-playing={isPlaying ? "true" : "false"} aria-hidden="true">
                        <span className="music-waveform-bar" />
                        <span className="music-waveform-bar" />
                        <span className="music-waveform-bar" />
                        <span className="music-waveform-bar" />
                      </div>
                    </div>
                    <p className="shrink-0 text-xs text-zinc-300">
                      {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-purple-400 to-sky-400 transition-all"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={post.music.url}
              className="sr-only"
              preload="metadata"
            />
            <p className="mt-2 text-xs text-zinc-400">Nhấn nút phát để nghe nhạc nền cho bài viết này.</p>
          </div>
        </div>
      ) : null}
      {showDetailLink ? (
        <div className="border-t border-white/6 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Mở để xem media và nhạc đầy đủ.</p>
            <Link
              href={`/post/${post.id}`}
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
