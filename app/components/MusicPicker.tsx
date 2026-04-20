"use client";

import { useState } from "react";
import type { PostMusic } from "@/lib/db";

type SearchTrack = {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  provider: "deezer";
};

export function MusicPicker({ initial }: { initial?: PostMusic | null }) {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchTrack[]>([]);
  const [selected, setSelected] = useState<PostMusic | null>(initial ?? null);
  const [autoPlaySelected, setAutoPlaySelected] = useState(false);

  async function onSearch() {
    const q = keyword.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) {
        setError("Không tìm được nhạc từ Deezer.");
        setResults([]);
      } else {
        const json = (await res.json()) as { data?: SearchTrack[] };
        setResults(Array.isArray(json.data) ? json.data : []);
      }
    } catch {
      setError("Lỗi kết nối khi tìm nhạc.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/40 p-4">
      <p className="text-sm font-medium text-zinc-300">Chọn nhạc từ Deezer (preview)</p>
      <div className="flex gap-2">
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDownCapture={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            e.stopPropagation();
            void onSearch();
          }}
          placeholder="Nhập tên bài hát hoặc ca sĩ..."
          className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none ring-sky-500 focus:ring-2"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="shrink-0 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "..." : "Tìm"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {selected ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-sm text-emerald-300">
            Đã chọn: <span className="font-medium">{selected.title}</span>
            {selected.artist ? ` — ${selected.artist}` : ""}
          </p>
          <audio
            key={selected.url}
            src={selected.url}
            controls
            autoPlay={autoPlaySelected}
            className="mt-2 w-full"
            preload="none"
          />
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setAutoPlaySelected(false);
            }}
            className="mt-2 text-xs text-zinc-300 underline-offset-2 hover:underline"
          >
            Bỏ chọn nhạc Deezer
          </button>
        </div>
      ) : null}
      {results.length > 0 ? (
        <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {results.map((track) => (
            <li key={track.id} className="rounded-lg border border-white/10 p-3">
              <p className="text-sm font-medium text-white">{track.title}</p>
              <p className="text-xs text-zinc-400">{track.artist}</p>
              <div className="mt-2 flex items-center gap-2">
                <audio src={track.previewUrl} controls className="w-full" preload="none" />
                <button
                  type="button"
                  onClick={() => {
                    setSelected({
                      provider: "deezer",
                      url: track.previewUrl,
                      title: track.title,
                      artist: track.artist,
                    });
                    setAutoPlaySelected(true);
                  }}
                  className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400"
                >
                  Chọn
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <input type="hidden" name="musicProvider" value={selected?.provider ?? ""} readOnly />
      <input type="hidden" name="musicUrl" value={selected?.url ?? ""} readOnly />
      <input type="hidden" name="musicTitle" value={selected?.title ?? ""} readOnly />
      <input type="hidden" name="musicArtist" value={selected?.artist ?? ""} readOnly />
    </div>
  );
}
