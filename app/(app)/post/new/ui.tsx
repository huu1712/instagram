"use client";

import { useActionState, useRef, useState } from "react";
import { createPostAction, type ActionState } from "@/lib/actions";
import { MusicPicker } from "@/app/components/MusicPicker";
import { useCloudinaryUpload } from "@/app/components/useCloudinaryUpload";

const initial: ActionState = {};

function UploadProgressBar({ name, percent, done, error }: { name: string; percent: number; done: boolean; error?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-zinc-400">{name}</span>
        {error ? (
          <span className="shrink-0 text-xs text-red-400">Lỗi</span>
        ) : done ? (
          <span className="shrink-0 text-xs text-emerald-400">✓</span>
        ) : (
          <span className="shrink-0 text-xs text-zinc-400">{percent}%</span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            error ? "bg-red-500" : done ? "bg-emerald-500" : "bg-sky-500"
          }`}
          style={{ width: `${error ? 100 : percent}%` }}
        />
      </div>
    </div>
  );
}

export function NewPostForm() {
  const [state, formAction, pending] = useActionState(createPostAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const allowSubmitRef = useRef(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState("");
  const { uploadFiles, uploading, progresses } = useCloudinaryUpload();

  const isLoading = uploading || pending;

  async function submitByButtonClick() {
    setUploadError("");

    if (selectedFiles.length === 0) {
      setUploadError("Hãy chọn ít nhất một ảnh hoặc video.");
      return;
    }

    const result = await uploadFiles(selectedFiles);
    if ("error" in result) {
      setUploadError(result.error);
      return;
    }

    // Update hidden input value before submitting
    if (mediaInputRef.current) {
      mediaInputRef.current.value = JSON.stringify(result.ok);
    }

    allowSubmitRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="relative space-y-5 rounded-2xl border border-white/12 bg-zinc-950/80 p-6 shadow-xl shadow-black/35 backdrop-blur"
      onSubmit={(e) => {
        if (!allowSubmitRef.current) {
          e.preventDefault();
        }
        allowSubmitRef.current = false;
      }}
    >
      {/* Hidden input chứa URLs đã upload */}
      <input
        ref={mediaInputRef}
        type="hidden"
        name="media_urls_json"
        defaultValue="[]"
        readOnly
      />

      {/* Overlay khi Server Action đang chạy */}
      {pending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-[2px]">
          <div className="inline-flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span className="text-xs font-medium text-zinc-300">Đang đăng bài…</span>
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor="media" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Ảnh hoặc video (chọn nhiều file)
        </label>
        <input
          id="media"
          name="media_picker"
          type="file"
          accept="image/*,video/*"
          multiple
          required
          disabled={isLoading}
          onChange={(e) => {
            setSelectedFiles(Array.from(e.target.files ?? []));
            setUploadError("");
          }}
          className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3.5 file:py-2 file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
        />
        <p className="mt-1.5 text-xs text-zinc-500">Giới hạn dung lượng phụ thuộc Cloudinary (plan) và trình duyệt.</p>
      </div>

      {/* Progress bars */}
      {progresses.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="text-xs font-medium text-zinc-400">
            {uploading ? "Đang upload lên Cloudinary…" : "Upload hoàn tất"}
          </p>
          {progresses.map((p, i) => (
            <UploadProgressBar key={i} {...p} />
          ))}
        </div>
      ) : null}

      <div>
        <label htmlFor="caption" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Chú thích
        </label>
        <textarea
          id="caption"
          name="caption"
          rows={4}
          placeholder="Viết gì đó…"
          disabled={isLoading}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5 text-white outline-none ring-sky-500/80 placeholder:text-zinc-500 focus:border-sky-500/50 focus:ring-2"
        />
      </div>
      <MusicPicker />

      {uploadError ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {uploadError}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void submitByButtonClick()}
        disabled={isLoading}
        className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/40 transition hover:brightness-110 disabled:opacity-50"
      >
        <span className="inline-flex items-center justify-center gap-2">
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : null}
          {uploading ? "Đang upload…" : pending ? "Đang đăng…" : "Chia sẻ"}
        </span>
      </button>
    </form>
  );
}
