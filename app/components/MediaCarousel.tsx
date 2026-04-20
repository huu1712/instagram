"use client";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { useCallback, useMemo, useRef, useState } from "react";
import type { PostMediaItem } from "@/lib/db";

const SWIPE_THRESHOLD = 40;
const TAP_THRESHOLD = 12;

export function MediaCarousel({ media }: { media: PostMediaItem[] }) {
  const [i, setI] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const imageTapStartX = useRef<number | null>(null);
  const imageTapStartY = useRef<number | null>(null);
  const n = media.length;
  const cur = media[i];

  const prev = useCallback(() => setI((x) => (x - 1 + n) % n), [n]);
  const next = useCallback(() => setI((x) => (x + 1) % n), [n]);
  const imageSlides = useMemo(() => {
    return media
      .map((m, idx) => ({ idx, src: m.url, kind: m.kind }))
      .filter((m) => m.kind === "image")
      .map((m) => ({ src: m.src, index: m.idx }));
  }, [media]);

  const imageIndexByMediaIndex = useMemo(() => {
    const map = new Map<number, number>();
    imageSlides.forEach((slide, idx) => map.set(slide.index, idx));
    return map;
  }, [imageSlides]);

  function handleSwipeStart(clientX: number, clientY: number) {
    touchStartX.current = clientX;
    touchStartY.current = clientY;
  }

  function handleSwipeEnd(clientX: number, clientY: number) {
    if (touchStartX.current == null || touchStartY.current == null || n <= 1) return;
    const diffX = clientX - touchStartX.current;
    const diffY = clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(diffX) < SWIPE_THRESHOLD || Math.abs(diffX) < Math.abs(diffY)) return;
    if (diffX > 0) prev();
    else next();
  }

  function openLightboxAtCurrent() {
    const mapped = imageIndexByMediaIndex.get(i);
    if (mapped == null) return;
    setLightboxIndex(mapped);
    setLightboxOpen(true);
  }

  if (!cur || n === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-zinc-900/80 text-zinc-500" />
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-black/90"
      onTouchStart={(e) => handleSwipeStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={(e) => handleSwipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
    >
      <div className="relative aspect-square w-full">
        {cur.kind === "video" ? (
          <video
            key={cur.url}
            src={cur.url}
            className="h-full w-full object-contain"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cur.url}
            alt=""
            onClick={openLightboxAtCurrent}
            onTouchStart={(e) => {
              imageTapStartX.current = e.touches[0].clientX;
              imageTapStartY.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              if (imageTapStartX.current == null || imageTapStartY.current == null) return;
              const diffX = Math.abs(e.changedTouches[0].clientX - imageTapStartX.current);
              const diffY = Math.abs(e.changedTouches[0].clientY - imageTapStartY.current);
              imageTapStartX.current = null;
              imageTapStartY.current = null;
              if (diffX <= TAP_THRESHOLD && diffY <= TAP_THRESHOLD) {
                openLightboxAtCurrent();
              }
            }}
            className="h-full w-full cursor-zoom-in object-contain"
          />
        )}
      </div>
      {n > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-base text-white backdrop-blur hover:bg-black/70"
            aria-label="Trước"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-base text-white backdrop-blur hover:bg-black/70"
            aria-label="Sau"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
            {media.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                className={`h-1.5 w-1.5 rounded-full transition ${idx === i ? "bg-white" : "bg-white/40"}`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={imageSlides.map((slide) => ({ src: slide.src }))}
        index={lightboxIndex}
        controller={{ closeOnBackdropClick: true }}
      />
    </div>
  );
}
