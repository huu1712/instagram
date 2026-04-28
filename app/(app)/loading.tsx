"use client";

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/70 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/6 px-4 py-4">
        <div className="h-11 w-11 animate-pulse rounded-2xl bg-white/8" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-full bg-white/8" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/6" />
        </div>
      </div>
      <div className="aspect-square w-full animate-pulse bg-white/6" />
      <div className="space-y-3 px-4 py-4">
        <div className="h-4 w-full animate-pulse rounded-full bg-white/8" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/6" />
      </div>
    </div>
  );
}

export default function AppLoading() {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/65 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded-full bg-white/8" />
            <div className="h-3 w-52 animate-pulse rounded-full bg-white/6" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-40 animate-pulse rounded-full bg-white/8" />
            <div className="h-10 w-40 animate-pulse rounded-full bg-white/8" />
          </div>
        </div>
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
