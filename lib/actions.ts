"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { clearSessionCookie, getSessionUserId, setSessionCookie } from "@/lib/auth";
import {
  addPost,
  createUser,
  deletePost,
  findPostById,
  findUserByUsername,
  type PostMediaItem,
  type PostMusic,
  updatePost,
  updateUserProfile,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const FIXED_USERNAME = "Youyue1314";
const FIXED_PASSWORD = "ht161723!";

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 40 * 1024 * 1024;
const MAX_AUDIO = 20 * 1024 * 1024;

function ensureUploadDir() {
  try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch {
    // Ignore write-protected filesystem errors (e.g. Vercel runtime).
  }
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "video/webm") return "webm";
  if (mime === "video/mp4" || mime === "video/x-m4v") return "mp4";
  if (mime === "video/quicktime") return "mov";
  if (mime === "audio/mpeg") return "mp3";
  if (mime === "audio/mp4") return "m4a";
  if (mime === "audio/wav" || mime === "audio/x-wav") return "wav";
  if (mime === "audio/ogg") return "ogg";
  if (mime === "audio/aac") return "aac";
  return "jpg";
}

function kindFromMime(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

async function saveUploadedMedia(
  file: File
): Promise<{ ok: PostMediaItem } | { error: string }> {
  const mime = file.type || "application/octet-stream";
  const kind = kindFromMime(mime);
  if (!kind) return { error: "Chỉ chấp nhận ảnh hoặc video." };
  const max = kind === "image" ? MAX_IMAGE : MAX_VIDEO;
  if (file.size > max) {
    return {
      error: kind === "image" ? "Mỗi ảnh tối đa 5MB." : "Mỗi video tối đa 40MB.",
    };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    ensureUploadDir();
    const name = `${randomUUID()}.${extFromMime(mime)}`;
    writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return { ok: { url: `/uploads/${name}`, kind } };
  } catch {
    return { error: "Server deploy không hỗ trợ lưu file cục bộ. Hãy dùng Cloudinary/S3." };
  }
}

async function saveUploadedMusic(file: File): Promise<{ ok: string } | { error: string }> {
  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("audio/")) return { error: "Nhạc phải là file audio." };
  if (file.size > MAX_AUDIO) return { error: "File nhạc tối đa 20MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    ensureUploadDir();
    const name = `${randomUUID()}.${extFromMime(mime)}`;
    writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return { ok: `/uploads/${name}` };
  } catch {
    return { error: "Server deploy không hỗ trợ lưu file cục bộ. Hãy dùng Cloudinary/S3." };
  }
}

export type ActionState = { error?: string; ok?: string };

function readSelectedMusic(formData: FormData): PostMusic | null {
  const provider = String(formData.get("musicProvider") ?? "").trim();
  const url = String(formData.get("musicUrl") ?? "").trim();
  const title = String(formData.get("musicTitle") ?? "").trim();
  const artist = String(formData.get("musicArtist") ?? "").trim();
  if (!provider || !url) return null;
  if (provider !== "deezer") return null;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  return {
    provider: "deezer",
    url,
    title: title || "Deezer track",
    artist,
  };
}

export async function registerAction(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  return { error: "Chức năng đăng ký đã tắt." };
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (username !== FIXED_USERNAME || password !== FIXED_PASSWORD) {
    return { error: "Sai tên đăng nhập hoặc mật khẩu." };
  }
  let user = findUserByUsername(FIXED_USERNAME);
  if (!user) {
    const { salt, hash } = hashPassword(FIXED_PASSWORD);
    user = createUser(FIXED_USERNAME, salt, hash);
  }
  await setSessionCookie(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Chưa đăng nhập." };
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName.length < 1) return { error: "Tên hiển thị không được để trống." };

  const avatar = formData.get("avatar");
  let avatarUrl: string | null | undefined;

  if (avatar instanceof File && avatar.size > 0) {
    const mime = avatar.type || "image/jpeg";
    if (!mime.startsWith("image/")) return { error: "Ảnh đại diện phải là file ảnh." };
    if (avatar.size > 2 * 1024 * 1024) return { error: "Ảnh tối đa 2MB." };
    const buf = Buffer.from(await avatar.arrayBuffer());
    try {
      ensureUploadDir();
      const name = `${randomUUID()}.${extFromMime(mime)}`;
      writeFileSync(path.join(UPLOAD_DIR, name), buf);
      avatarUrl = `/uploads/${name}`;
    } catch {
      return { error: "Server deploy không hỗ trợ lưu ảnh cục bộ. Hãy dùng Cloudinary/S3." };
    }
  }

  const patch: { displayName: string; avatarUrl?: string | null } = { displayName };
  if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl;
  const u = updateUserProfile(userId, patch);
  if (!u) return { error: "Không tìm thấy người dùng." };
  return { ok: "Đã lưu hồ sơ." };
}

function collectMediaFiles(formData: FormData, fieldName: string): File[] {
  return formData
    .getAll(fieldName)
    .filter((x): x is File => x instanceof File && x.size > 0);
}

export async function createPostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Chưa đăng nhập." };
  const caption = String(formData.get("caption") ?? "");
  const files = collectMediaFiles(formData, "media");
  if (files.length === 0) return { error: "Hãy chọn ít nhất một ảnh hoặc video." };

  const media: PostMediaItem[] = [];
  for (const file of files) {
    const r = await saveUploadedMedia(file);
    if ("error" in r) return { error: r.error };
    media.push(r.ok);
  }

  const selectedMusic = readSelectedMusic(formData);
  let music: PostMusic | null = selectedMusic;
  if (!music) {
    const musicFile = formData.get("music");
    if (musicFile instanceof File && musicFile.size > 0) {
      const r = await saveUploadedMusic(musicFile);
      if ("error" in r) return { error: r.error };
      music = { provider: "upload", url: r.ok, title: "Nhạc tải lên", artist: "" };
    }
  }

  addPost(userId, media, caption, music);
  redirect("/");
}

export async function updatePostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Chưa đăng nhập." };
  const postId = String(formData.get("postId") ?? "").trim();
  if (!postId) return { error: "Thiếu bài đăng." };

  const post = findPostById(postId);
  if (!post || post.userId !== userId) return { error: "Không tìm thấy bài đăng." };

  const caption = String(formData.get("caption") ?? "");
  const existingRaw = String(formData.get("existing_json") ?? "[]");
  let preserved: PostMediaItem[];
  try {
    preserved = JSON.parse(existingRaw) as PostMediaItem[];
    if (!Array.isArray(preserved)) throw new Error("invalid");
  } catch {
    return { error: "Dữ liệu media không hợp lệ." };
  }

  const allowed = new Set(post.media.map((m) => `${m.url}\0${m.kind}`));
  for (const p of preserved) {
    if (!p || typeof p.url !== "string" || (p.kind !== "image" && p.kind !== "video")) {
      return { error: "Media giữ lại không hợp lệ." };
    }
    if (!allowed.has(`${p.url}\0${p.kind}`)) return { error: "Media giữ lại không khớp bài đăng." };
  }

  const newFiles = collectMediaFiles(formData, "media");
  const newMedia: PostMediaItem[] = [];
  for (const file of newFiles) {
    const r = await saveUploadedMedia(file);
    if ("error" in r) return { error: r.error };
    newMedia.push(r.ok);
  }

  const finalMedia = [...preserved, ...newMedia];
  if (finalMedia.length === 0) return { error: "Cần ít nhất một ảnh hoặc video." };

  const removeMusic = String(formData.get("removeMusic") ?? "") === "on";
  let nextMusic: PostMusic | null = removeMusic ? null : post.music;
  const selectedMusic = readSelectedMusic(formData);
  if (selectedMusic) {
    nextMusic = selectedMusic;
  } else {
    const musicFile = formData.get("music");
    if (musicFile instanceof File && musicFile.size > 0) {
      const r = await saveUploadedMusic(musicFile);
      if ("error" in r) return { error: r.error };
      nextMusic = { provider: "upload", url: r.ok, title: "Nhạc tải lên", artist: "" };
    }
  }

  updatePost(userId, postId, { caption, media: finalMedia, music: nextMusic });
  redirect("/");
}

export async function deletePostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Chưa đăng nhập." };
  const postId = String(formData.get("postId") ?? "").trim();
  if (!postId) return { error: "Thiếu bài đăng." };
  if (!deletePost(userId, postId)) return { error: "Không xóa được bài đăng." };
  redirect("/");
}

export async function seedDemoUserAction(): Promise<ActionState> {
  return { error: "Chức năng tạo tài khoản đã tắt." };
}
