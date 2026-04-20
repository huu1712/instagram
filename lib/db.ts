import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type User = {
  id: string;
  username: string;
  passwordSalt: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type PostMediaItem = {
  url: string;
  kind: "image" | "video";
};

export type PostMusic = {
  url: string;
  title: string;
  artist: string;
  provider: "upload" | "deezer";
};

export type Post = {
  id: string;
  userId: string;
  media: PostMediaItem[];
  music: PostMusic | null;
  caption: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");

function ensureDataDir() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Vercel runtime filesystem is read-only; ignore to avoid crashing.
  }
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(file: string, data: unknown) {
  try {
    ensureDataDir();
    writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Ignore write failure in immutable serverless FS.
  }
}

/** Chuẩn hoá bài cũ chỉ có `imageUrl` */
function migrateRawPost(raw: Record<string, unknown>): Post {
  const id = String(raw.id ?? "");
  const userId = String(raw.userId ?? "");
  const caption = String(raw.caption ?? "");
  const createdAt = String(raw.createdAt ?? new Date().toISOString());
  let music: PostMusic | null = null;
  if (raw.music && typeof raw.music === "object") {
    const m = raw.music as Record<string, unknown>;
    if (typeof m.url === "string" && m.url.trim().length > 0) {
      music = {
        url: m.url,
        title: typeof m.title === "string" && m.title.trim() ? m.title : "Nhạc nền",
        artist: typeof m.artist === "string" ? m.artist : "",
        provider: m.provider === "deezer" ? "deezer" : "upload",
      };
    }
  } else if (raw.musicUrl != null) {
    const musicUrl = String(raw.musicUrl);
    if (musicUrl) {
      music = {
        url: musicUrl,
        title: typeof raw.musicTitle === "string" && raw.musicTitle.trim() ? raw.musicTitle : "Nhạc nền",
        artist: typeof raw.musicArtist === "string" ? raw.musicArtist : "",
        provider: raw.musicProvider === "deezer" ? "deezer" : "upload",
      };
    }
  }
  const mediaRaw = raw.media;
  if (Array.isArray(mediaRaw) && mediaRaw.length > 0) {
    const media = mediaRaw
      .map((m) => {
        const o = m as Record<string, unknown>;
        const url = String(o.url ?? "");
        const kind = o.kind === "video" ? "video" : "image";
        if (!url) return null;
        return { url, kind } as PostMediaItem;
      })
      .filter(Boolean) as PostMediaItem[];
    return { id, userId, caption, createdAt, media, music };
  }
  const imageUrl = raw.imageUrl != null ? String(raw.imageUrl) : "";
  return {
    id,
    userId,
    caption,
    createdAt,
    media: imageUrl ? [{ url: imageUrl, kind: "image" as const }] : [],
    music,
  };
}

export function getUsers(): User[] {
  return readJsonFile<User[]>(USERS_FILE, []);
}

export function saveUsers(users: User[]) {
  writeJsonFile(USERS_FILE, users);
}

export function getPosts(): Post[] {
  const raw = readJsonFile<Record<string, unknown>[]>(POSTS_FILE, []);
  return raw.map((r) => migrateRawPost(r));
}

export function savePosts(posts: Post[]) {
  writeJsonFile(POSTS_FILE, posts);
}

export function findUserByUsername(username: string): User | undefined {
  const u = username.trim().toLowerCase();
  return getUsers().find((x) => x.username.toLowerCase() === u);
}

export function findUserById(id: string): User | undefined {
  return getUsers().find((x) => x.id === id);
}

export function findPostById(id: string): Post | undefined {
  return getPosts().find((p) => p.id === id);
}

export function createUser(username: string, passwordSalt: string, passwordHash: string): User {
  const users = getUsers();
  const user: User = {
    id: randomUUID(),
    username: username.trim(),
    passwordSalt,
    passwordHash,
    displayName: username.trim(),
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export function updateUserProfile(
  userId: string,
  patch: { displayName?: string; avatarUrl?: string | null }
): User | null {
  const users = getUsers();
  const idx = users.findIndex((x) => x.id === userId);
  if (idx === -1) return null;
  if (patch.displayName !== undefined) users[idx].displayName = patch.displayName.trim();
  if (patch.avatarUrl !== undefined) users[idx].avatarUrl = patch.avatarUrl;
  saveUsers(users);
  return users[idx];
}

export function deleteLocalUpload(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const name = url.slice("/uploads/".length).replace(/[/\\]/g, "");
  if (!name || name.includes("..")) return;
  const full = path.join(process.cwd(), "public", "uploads", name);
  try {
    if (existsSync(full)) unlinkSync(full);
  } catch {
    // Ignore delete failure in immutable serverless FS.
  }
}

export function addPost(
  userId: string,
  media: PostMediaItem[],
  caption: string,
  music: PostMusic | null
): Post {
  const posts = getPosts();
  const post: Post = {
    id: randomUUID(),
    userId,
    media,
    music,
    caption: caption.trim(),
    createdAt: new Date().toISOString(),
  };
  posts.unshift(post);
  savePosts(posts);
  return post;
}

export function updatePost(
  userId: string,
  postId: string,
  next: { caption: string; media: PostMediaItem[]; music: PostMusic | null }
): Post | null {
  const posts = getPosts();
  const idx = posts.findIndex((p) => p.id === postId);
  if (idx === -1) return null;
  if (posts[idx].userId !== userId) return null;

  const prevUrls = new Set(posts[idx].media.map((m) => m.url));
  const nextUrls = new Set(next.media.map((m) => m.url));
  for (const url of prevUrls) {
    if (!nextUrls.has(url)) deleteLocalUpload(url);
  }
  if (
    posts[idx].music &&
    posts[idx].music.provider === "upload" &&
    posts[idx].music.url !== next.music?.url
  ) {
    deleteLocalUpload(posts[idx].music.url);
  }

  posts[idx] = {
    ...posts[idx],
    caption: next.caption.trim(),
    media: next.media,
    music: next.music,
  };
  savePosts(posts);
  return posts[idx];
}

export function deletePost(userId: string, postId: string): boolean {
  const posts = getPosts();
  const idx = posts.findIndex((p) => p.id === postId);
  if (idx === -1) return false;
  if (posts[idx].userId !== userId) return false;
  for (const m of posts[idx].media) deleteLocalUpload(m.url);
  if (posts[idx].music && posts[idx].music.provider === "upload") {
    deleteLocalUpload(posts[idx].music.url);
  }
  posts.splice(idx, 1);
  savePosts(posts);
  return true;
}
