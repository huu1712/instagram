import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { deleteManagedFile } from "@/lib/storage";

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
  pinned: boolean;
  createdAt: string;
};

export class DataStoreWriteError extends Error {
  constructor(message = "Không thể lưu dữ liệu vào Postgres. Kiểm tra biến môi trường DATABASE_URL.") {
    super(message);
    this.name = "DataStoreWriteError";
  }
}

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new DataStoreWriteError("Thiếu DATABASE_URL. Hãy thêm biến môi trường Postgres trên local/Vercel.");
  }
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  });
  return pool;
}

async function ensureSchema() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getPool();
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL,
          avatar_url TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          media JSONB NOT NULL,
          music JSONB NULL,
          caption TEXT NOT NULL,
          pinned BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await db.query(`
        ALTER TABLE posts
        ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_posts_pinned_created_at ON posts(pinned DESC, created_at DESC);
      `);
    })();
  }
  await initPromise;
}

function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    username: String(row.username),
    passwordSalt: String(row.password_salt),
    passwordHash: String(row.password_hash),
    displayName: String(row.display_name),
    avatarUrl: row.avatar_url == null ? null : String(row.avatar_url),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function parseMedia(media: unknown): PostMediaItem[] {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => {
      const item = m as Record<string, unknown>;
      if (typeof item?.url !== "string") return null;
      return {
        url: item.url,
        kind: item.kind === "video" ? "video" : "image",
      } as PostMediaItem;
    })
    .filter(Boolean) as PostMediaItem[];
}

function parseMusic(music: unknown): PostMusic | null {
  if (!music || typeof music !== "object") return null;
  const m = music as Record<string, unknown>;
  if (typeof m.url !== "string" || !m.url) return null;
  return {
    url: m.url,
    title: typeof m.title === "string" ? m.title : "Nhạc nền",
    artist: typeof m.artist === "string" ? m.artist : "",
    provider: m.provider === "deezer" ? "deezer" : "upload",
  };
}

function mapPostRow(row: Record<string, unknown>): Post {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    media: parseMedia(row.media),
    music: parseMusic(row.music),
    caption: String(row.caption ?? ""),
    pinned: row.pinned === true,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function getUsers(): Promise<User[]> {
  try {
    await ensureSchema();
    const db = getPool();
    const result = await db.query("SELECT * FROM users ORDER BY created_at ASC");
    return result.rows.map((row: unknown) => mapUserRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function getPosts(): Promise<Post[]> {
  try {
    await ensureSchema();
    const db = getPool();
    const result = await db.query("SELECT * FROM posts ORDER BY pinned DESC, created_at DESC");
    return result.rows.map((row: unknown) => mapPostRow(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const u = username.trim().toLowerCase();
  try {
    await ensureSchema();
    const db = getPool();
    const result = await db.query("SELECT * FROM users WHERE lower(username) = $1 LIMIT 1", [u]);
    const row = result.rows[0];
    return row ? mapUserRow(row as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export async function findUserById(id: string): Promise<User | undefined> {
  try {
    await ensureSchema();
    const db = getPool();
    const result = await db.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
    const row = result.rows[0];
    return row ? mapUserRow(row as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export async function findPostById(id: string): Promise<Post | undefined> {
  try {
    await ensureSchema();
    const db = getPool();
    const result = await db.query("SELECT * FROM posts WHERE id = $1 LIMIT 1", [id]);
    const row = result.rows[0];
    return row ? mapPostRow(row as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export async function createUser(
  username: string,
  passwordSalt: string,
  passwordHash: string
): Promise<User> {
  await ensureSchema();
  const db = getPool();
  const user: User = {
    id: randomUUID(),
    username: username.trim(),
    passwordSalt,
    passwordHash,
    displayName: username.trim(),
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  };
  try {
    await db.query(
      `INSERT INTO users (id, username, password_salt, password_hash, display_name, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.username, user.passwordSalt, user.passwordHash, user.displayName, user.avatarUrl, user.createdAt]
    );
    return user;
  } catch (error) {
    throw new DataStoreWriteError(error instanceof Error ? error.message : undefined);
  }
}

export async function updateUserProfile(
  userId: string,
  patch: { displayName?: string; avatarUrl?: string | null }
): Promise<User | null> {
  await ensureSchema();
  const db = getPool();
  try {
    const result = await db.query(
      `UPDATE users
       SET display_name = COALESCE($2, display_name),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $1
       RETURNING *`,
      [userId, patch.displayName?.trim() ?? null, patch.avatarUrl ?? null]
    );
    const row = result.rows[0];
    return row ? mapUserRow(row as Record<string, unknown>) : null;
  } catch (error) {
    throw new DataStoreWriteError(error instanceof Error ? error.message : undefined);
  }
}

export async function deleteManagedUpload(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      await deleteManagedFile(url);
    } catch {
      // Ignore storage delete failures to avoid blocking post operations.
    }
    return;
  }
  if (!url.startsWith("/uploads/")) return;
  const name = url.slice("/uploads/".length).replace(/[/\\]/g, "");
  if (!name || name.includes("..")) return;
  const full = path.join(process.cwd(), "public", "uploads", name);
  try {
    if (existsSync(full)) unlinkSync(full);
  } catch {
    // Ignore local delete failures.
  }
}

export async function addPost(
  userId: string,
  media: PostMediaItem[],
  caption: string,
  music: PostMusic | null
): Promise<Post> {
  await ensureSchema();
  const db = getPool();
  const post: Post = {
    id: randomUUID(),
    userId,
    media,
    music,
    caption: caption.trim(),
    pinned: false,
    createdAt: new Date().toISOString(),
  };
  try {
    await db.query(
      `INSERT INTO posts (id, user_id, media, music, caption, pinned, created_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)`,
      [post.id, post.userId, JSON.stringify(post.media), JSON.stringify(post.music), post.caption, post.pinned, post.createdAt]
    );
    return post;
  } catch (error) {
    throw new DataStoreWriteError(error instanceof Error ? error.message : undefined);
  }
}

export async function updatePost(
  userId: string,
  postId: string,
  next: { caption: string; media: PostMediaItem[]; music: PostMusic | null }
): Promise<Post | null> {
  await ensureSchema();
  const db = getPool();
  const current = await findPostById(postId);
  if (!current || current.userId !== userId) return null;

  const prevUrls = new Set(current.media.map((m) => m.url));
  const nextUrls = new Set(next.media.map((m) => m.url));
  for (const url of prevUrls) {
    if (!nextUrls.has(url)) await deleteManagedUpload(url);
  }
  if (current.music && current.music.provider === "upload" && current.music.url !== next.music?.url) {
    await deleteManagedUpload(current.music.url);
  }
  try {
    const result = await db.query(
      `UPDATE posts
       SET caption = $3, media = $4::jsonb, music = $5::jsonb
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [postId, userId, next.caption.trim(), JSON.stringify(next.media), JSON.stringify(next.music)]
    );
    const row = result.rows[0];
    return row ? mapPostRow(row as Record<string, unknown>) : null;
  } catch (error) {
    throw new DataStoreWriteError(error instanceof Error ? error.message : undefined);
  }
}

export async function deletePost(userId: string, postId: string): Promise<boolean> {
  await ensureSchema();
  const db = getPool();
  const post = await findPostById(postId);
  if (!post || post.userId !== userId) return false;
  for (const m of post.media) await deleteManagedUpload(m.url);
  if (post.music && post.music.provider === "upload") await deleteManagedUpload(post.music.url);
  try {
    const result = await db.query("DELETE FROM posts WHERE id = $1 AND user_id = $2", [postId, userId]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    throw new DataStoreWriteError(error instanceof Error ? error.message : undefined);
  }
}

export async function setPostPinned(userId: string, postId: string, pinned: boolean): Promise<Post | null> {
  await ensureSchema();
  const db = getPool();
  try {
    const result = await db.query(
      `UPDATE posts
       SET pinned = $3
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [postId, userId, pinned]
    );
    const row = result.rows[0];
    return row ? mapPostRow(row as Record<string, unknown>) : null;
  } catch (error) {
    throw new DataStoreWriteError(error instanceof Error ? error.message : undefined);
  }
}
