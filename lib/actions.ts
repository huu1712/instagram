"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSessionCookie, getSessionUserId, setSessionCookie } from "@/lib/auth";
import {
  addPost,
  createUser,
  DataStoreWriteError,
  deletePost,
  findPostById,
  findUserByUsername,
  setPostPinned,
  type PostMediaItem,
  type PostMusic,
  updatePost,
  updateUserProfile,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";

const FIXED_USERNAME = "Youyue1314";
const FIXED_PASSWORD = "ht161723!";

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

export async function registerAction(): Promise<ActionState> {
  return { error: "Chức năng đăng ký đã tắt." };
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (username !== FIXED_USERNAME || password !== FIXED_PASSWORD) {
    return { error: "Sai tên đăng nhập hoặc mật khẩu." };
  }
  let user = await findUserByUsername(FIXED_USERNAME);
  if (!user) {
    try {
      const { salt, hash } = hashPassword(FIXED_PASSWORD);
      user = await createUser(FIXED_USERNAME, salt, hash);
    } catch (error) {
      if (error instanceof DataStoreWriteError) return { error: error.message };
      return { error: "Không tạo được tài khoản mặc định." };
    }
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

  // avatarUrl được upload client-side, nhận qua hidden input
  const avatarUrlInput = String(formData.get("avatarUrl") ?? "").trim();
  let avatarUrl: string | null | undefined;
  if (avatarUrlInput) {
    if (!avatarUrlInput.startsWith("https://res.cloudinary.com/")) {
      return { error: "URL ảnh đại diện không hợp lệ." };
    }
    avatarUrl = avatarUrlInput;
  }

  const patch: { displayName: string; avatarUrl?: string | null } = { displayName };
  if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl;
  let u;
  try {
    u = await updateUserProfile(userId, patch);
  } catch (error) {
    if (error instanceof DataStoreWriteError) return { error: error.message };
    return { error: "Không thể cập nhật hồ sơ lúc này." };
  }
  if (!u) return { error: "Không tìm thấy người dùng." };
  return { ok: "Đã lưu hồ sơ." };
}

function parseMediaUrlsJson(raw: string): { ok: PostMediaItem[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Dữ liệu media không hợp lệ." };
  }
  if (!Array.isArray(parsed)) return { error: "Dữ liệu media không hợp lệ." };
  for (const item of parsed) {
    if (
      !item ||
      typeof item.url !== "string" ||
      !item.url.startsWith("https://") ||
      (item.kind !== "image" && item.kind !== "video")
    ) {
      return { error: "Dữ liệu media không hợp lệ." };
    }
  }
  return { ok: parsed as PostMediaItem[] };
}

export async function createPostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Chưa đăng nhập." };
  const caption = String(formData.get("caption") ?? "");

  const mediaUrlsRaw = String(formData.get("media_urls_json") ?? "[]");
  const parsedMedia = parseMediaUrlsJson(mediaUrlsRaw);
  if ("error" in parsedMedia) return { error: parsedMedia.error };
  const media = parsedMedia.ok;
  if (media.length === 0) return { error: "Hãy chọn ít nhất một ảnh hoặc video." };

  const music: PostMusic | null = readSelectedMusic(formData);

  try {
    await addPost(userId, media, caption, music);
  } catch (error) {
    if (error instanceof DataStoreWriteError) return { error: error.message };
    return { error: "Không thể tạo bài đăng lúc này." };
  }
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

  const post = await findPostById(postId);
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

  // Media mới đã được upload client-side, chỉ nhận URLs.
  const newMediaRaw = String(formData.get("new_media_urls_json") ?? "[]");
  const parsedNew = parseMediaUrlsJson(newMediaRaw);
  if ("error" in parsedNew) return { error: parsedNew.error };
  const newMedia = parsedNew.ok;

  const finalMedia = [...preserved, ...newMedia];
  if (finalMedia.length === 0) return { error: "Cần ít nhất một ảnh hoặc video." };

  const removeMusic = String(formData.get("removeMusic") ?? "") === "on";
  let nextMusic: PostMusic | null = removeMusic ? null : post.music;
  const selectedMusic = readSelectedMusic(formData);
  if (selectedMusic) {
    nextMusic = selectedMusic;
  }

  try {
    await updatePost(userId, postId, { caption, media: finalMedia, music: nextMusic });
  } catch (error) {
    if (error instanceof DataStoreWriteError) return { error: error.message };
    return { error: "Không thể cập nhật bài đăng lúc này." };
  }
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
  try {
    if (!(await deletePost(userId, postId))) return { error: "Không xóa được bài đăng." };
  } catch (error) {
    if (error instanceof DataStoreWriteError) return { error: error.message };
    return { error: "Không thể xóa bài đăng lúc này." };
  }
  redirect("/");
}

export async function togglePostPinnedAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Chưa đăng nhập." };

  const postId = String(formData.get("postId") ?? "").trim();
  if (!postId) return { error: "Thiếu bài đăng." };

  const pinnedInput = String(formData.get("pinned") ?? "").trim();
  const pinned = pinnedInput === "true";

  try {
    const updated = await setPostPinned(userId, postId, pinned);
    if (!updated) return { error: "Không cập nhật được trạng thái ghim." };
  } catch (error) {
    if (error instanceof DataStoreWriteError) return { error: error.message };
    return { error: "Không thể cập nhật trạng thái ghim lúc này." };
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { ok: pinned ? "Đã ghim bài viết." : "Đã bỏ ghim bài viết." };
}

export async function seedDemoUserAction(): Promise<ActionState> {
  return { error: "Chức năng tạo tài khoản đã tắt." };
}
