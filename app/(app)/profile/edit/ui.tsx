"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction, type ActionState } from "@/lib/actions";

const initial: ActionState = {};

type SignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: string;
  folder: string;
  signature: string;
};

async function uploadAvatarDirect(file: File): Promise<{ ok: string } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "Ảnh đại diện phải là file ảnh." };

  let sign: SignResponse;
  try {
    const res = await fetch("/api/upload/sign");
    if (!res.ok) throw new Error("Không lấy được thông tin upload.");
    sign = await res.json() as SignResponse;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi lấy chữ ký upload." };
  }

  const body = new FormData();
  body.append("file", file);
  body.append("folder", sign.folder);
  body.append("timestamp", sign.timestamp);
  body.append("api_key", sign.apiKey);
  body.append("signature", sign.signature);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
      method: "POST",
      body,
    });
    if (!res.ok) {
      const payload = await res.json() as { error?: { message?: string } };
      throw new Error(payload?.error?.message ?? `Upload thất bại (${res.status})`);
    }
    const payload = await res.json() as { secure_url?: string };
    if (!payload.secure_url) throw new Error("Cloudinary không trả về URL.");
    return { ok: payload.secure_url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload ảnh thất bại." };
  }
}

export function ProfileForm({
  defaultDisplayName,
  avatarUrl,
}: {
  defaultDisplayName: string;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initial);
  const router = useRouter();
  const [avatarUploadUrl, setAvatarUploadUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  async function handleAvatarChange(file: File | undefined) {
    if (!file) return;
    setAvatarError("");
    setAvatarUploadUrl(null);

    // Preview ngay lập tức
    setPreviewUrl(URL.createObjectURL(file));

    setAvatarUploading(true);
    const result = await uploadAvatarDirect(file);
    setAvatarUploading(false);

    if ("error" in result) {
      setAvatarError(result.error);
      setPreviewUrl(avatarUrl); // revert preview
    } else {
      setAvatarUploadUrl(result.ok);
    }
  }

  const isLoading = avatarUploading || pending;

  return (
    <form
      action={formAction}
      className="relative space-y-6 rounded-2xl border border-white/12 bg-zinc-950/80 p-6 shadow-xl shadow-black/35 backdrop-blur"
    >
      {/* Hidden input chứa avatar URL đã upload */}
      <input type="hidden" name="avatarUrl" value={avatarUploadUrl ?? ""} readOnly />

      {pending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-[2px]">
          <div className="inline-flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span className="text-xs font-medium text-zinc-300">Đang lưu hồ sơ…</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/10">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500">
                {defaultDisplayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          {avatarUploading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          ) : null}
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
              disabled={isLoading}
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
              name="avatar_picker"
              type="file"
              accept="image/*"
              disabled={isLoading}
              onChange={(e) => void handleAvatarChange(e.target.files?.[0])}
              className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3.5 file:py-2 file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
            />
            {avatarUploading ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="h-3 w-3 animate-spin rounded-full border border-zinc-400/40 border-t-zinc-200" />
                Đang upload ảnh…
              </p>
            ) : avatarUploadUrl ? (
              <p className="mt-1.5 text-xs text-emerald-400">✓ Ảnh đã sẵn sàng</p>
            ) : null}
          </div>
        </div>
      </div>

      {avatarError ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {avatarError}
        </p>
      ) : null}
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
        disabled={isLoading}
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
