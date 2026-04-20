"use client";

import { useActionState, useRef } from "react";
import { createPostAction, type ActionState } from "@/lib/actions";
import { MusicPicker } from "@/app/components/MusicPicker";

const initial: ActionState = {};

export function NewPostForm() {
  const [state, formAction, pending] = useActionState(createPostAction, initial);
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
      className="space-y-5 rounded-2xl border border-white/12 bg-zinc-950/80 p-6 shadow-xl shadow-black/35 backdrop-blur"
      onSubmit={(e) => {
        if (!allowSubmitRef.current) {
          e.preventDefault();
        }
        allowSubmitRef.current = false;
      }}
    >
      <div>
        <label htmlFor="media" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Ảnh hoặc video (chọn nhiều file)
        </label>
        <input
          id="media"
          name="media"
          type="file"
          accept="image/*,video/*"
          multiple
          required
          className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3.5 file:py-2 file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Ảnh tối đa 5MB mỗi file · video tối đa 40MB mỗi file (mp4, webm, mov…)
        </p>
      </div>
      <div>
        <label htmlFor="caption" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Chú thích
        </label>
        <textarea
          id="caption"
          name="caption"
          rows={4}
          placeholder="Viết gì đó…"
          className="w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5 text-white outline-none ring-sky-500/80 placeholder:text-zinc-500 focus:border-sky-500/50 focus:ring-2"
        />
      </div>
      <MusicPicker />
      <div>
        <label htmlFor="music" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Hoặc tải nhạc từ máy (tùy chọn)
        </label>
        <input
          id="music"
          name="music"
          type="file"
          accept="audio/*"
          className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3.5 file:py-2 file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Tối đa 20MB (mp3, m4a, wav, ogg...). Nếu đã chọn nhạc Deezer thì sẽ ưu tiên Deezer.
        </p>
      </div>
      {state.error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={submitByButtonClick}
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Đang đăng…" : "Chia sẻ"}
      </button>
    </form>
  );
}
