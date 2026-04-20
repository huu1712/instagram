"use client";

import { useActionState, useRef, useState } from "react";
import { updatePostAction, type ActionState } from "@/lib/actions";
import type { Post, PostMediaItem } from "@/lib/db";
import { MusicPicker } from "@/app/components/MusicPicker";

const initial: ActionState = {};

export function EditPostForm({ post }: { post: Post }) {
  const [preserved, setPreserved] = useState<PostMediaItem[]>(post.media);
  const [state, formAction, pending] = useActionState(updatePostAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const allowSubmitRef = useRef(false);

  function submitByButtonClick() {
    allowSubmitRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6 rounded-2xl border border-white/12 bg-zinc-950/80 p-6 shadow-xl shadow-black/35 backdrop-blur"
      onSubmit={(e) => {
        if (!allowSubmitRef.current) {
          e.preventDefault();
        }
        allowSubmitRef.current = false;
      }}
    >
      <input type="hidden" name="postId" value={post.id} />
      <input
        type="hidden"
        name="existing_json"
        readOnly
        value={JSON.stringify(preserved)}
      />

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-300">Media hiện tại</p>
        {preserved.length === 0 ? (
          <p className="text-sm text-zinc-500">Không còn file nào — hãy thêm ảnh/video mới bên dưới.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {preserved.map((m, idx) => (
              <li
                key={`${m.url}-${idx}`}
                className="relative overflow-hidden rounded-lg border border-white/10 bg-black"
              >
                <div className="aspect-square">
                  {m.kind === "video" ? (
                    <video src={m.url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPreserved((p) => p.filter((_, i) => i !== idx))}
                  className="mt-2 w-full rounded-lg bg-red-500/20 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/30"
                >
                  Gỡ khỏi bài
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="media" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Thêm ảnh hoặc video mới (tùy chọn, nhiều file)
        </label>
        <input
          id="media"
          name="media"
          type="file"
          accept="image/*,video/*"
          multiple
          className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3.5 file:py-2 file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
        />
      </div>

      <div>
        <label htmlFor="caption" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Chú thích
        </label>
        <textarea
          id="caption"
          name="caption"
          rows={4}
          defaultValue={post.caption}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5 text-white outline-none ring-sky-500/80 focus:border-sky-500/50 focus:ring-2"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm font-medium text-zinc-300">Nhạc nền</p>
        {post.music ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">
              {post.music.title}
              {post.music.artist ? ` — ${post.music.artist}` : ""}
              <span className="ml-2 text-xs uppercase text-zinc-500">({post.music.provider})</span>
            </p>
            <audio src={post.music.url} controls className="w-full" preload="none" />
            <label className="inline-flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" name="removeMusic" className="rounded border-white/20 bg-black" />
              Gỡ nhạc hiện tại
            </label>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Chưa có nhạc cho bài viết này.</p>
        )}
        <MusicPicker initial={post.music?.provider === "deezer" ? post.music : null} />
        <div>
          <label htmlFor="music" className="mb-1 block text-sm text-zinc-400">
            Hoặc tải nhạc mới từ máy (tùy chọn)
          </label>
          <input
            id="music"
            name="music"
            type="file"
            accept="audio/*"
            className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3.5 file:py-2 file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
          />
          <p className="mt-1 text-xs text-zinc-600">
            Nếu chọn Deezer và file cùng lúc, hệ thống sẽ ưu tiên Deezer.
          </p>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submitByButtonClick}
          disabled={pending}
          className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
