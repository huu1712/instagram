"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction, type ActionState } from "@/lib/actions";

const initial: ActionState = {};

export function ProfileForm({
  defaultDisplayName,
  avatarUrl,
}: {
  defaultDisplayName: string;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form
      action={formAction}
      className="relative space-y-6 rounded-2xl border border-white/12 bg-zinc-950/80 p-6 shadow-xl shadow-black/35 backdrop-blur"
    >
      {pending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/45 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-200">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Đang xử lý...
          </div>
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/10">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500">
              {defaultDisplayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="w-full flex-1 space-y-4">
          <div>
            <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Tên hiển thị
            </label>
            <input
              id="displayName"
              name="displayName"
              required
              disabled={pending}
              defaultValue={defaultDisplayName}
              className="w-full rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5 text-white outline-none ring-sky-500/80 focus:border-sky-500/50 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="avatar" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Ảnh đại diện mới (tùy chọn)
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              disabled={pending}
              className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3.5 file:py-2 file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
            />
          </div>
        </div>
      </div>
      {state.error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300" role="status">
          {state.ok}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        <span className="inline-flex items-center gap-2">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
          {pending ? "Đang lưu…" : "Lưu"}
        </span>
      </button>
    </form>
  );
}
