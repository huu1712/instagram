import { NextResponse } from "next/server";

type DeezerTrack = {
  id: number;
  title: string;
  preview: string;
  artist?: { name?: string };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ data: [] });
  }

  const endpoint = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=10`;
  const resp = await fetch(endpoint, { cache: "no-store" });
  if (!resp.ok) {
    return NextResponse.json({ error: "Không gọi được Deezer API." }, { status: 502 });
  }

  const json = (await resp.json()) as { data?: DeezerTrack[] };
  const data = Array.isArray(json.data)
    ? json.data
        .filter((t) => typeof t.preview === "string" && t.preview.length > 0)
        .map((t) => ({
          id: String(t.id),
          title: t.title || "Unknown title",
          artist: t.artist?.name || "Unknown artist",
          previewUrl: t.preview,
          provider: "deezer" as const,
        }))
    : [];

  return NextResponse.json({ data });
}
