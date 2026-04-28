"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/lib/actions";
import Image from "next/image";

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M3 8.5 10 3l7 5.5V17a1 1 0 0 1-1 1h-4.5v-4.5h-3V18H4a1 1 0 0 1-1-1V8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 1 1 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8M12 6l4 4-4 4M8 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 3v2.2M10 14.8V17M5.05 5.05l1.56 1.56M13.39 13.39l1.56 1.56M3 10h2.2M14.8 10H17M5.05 14.95l1.56-1.56M13.39 6.61l1.56-1.56M13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function navLink(href: string, label: string, pathname: string, icon: React.ReactNode, lightMode: boolean) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition ${
        active
          ? lightMode
            ? "bg-zinc-950 text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)]"
            : "bg-white text-zinc-950 shadow-[0_10px_30px_rgba(255,255,255,0.18)]"
          : lightMode
            ? "text-zinc-700 hover:bg-zinc-950/6 hover:text-zinc-950"
            : "text-zinc-300 hover:bg-white/8 hover:text-white"
      }`}
    >
      <span className={active ? (lightMode ? "text-white" : "text-zinc-950") : lightMode ? "text-zinc-500" : "text-zinc-400"}>{icon}</span>
      {label}
    </Link>
  );
}

function LogoutButton({ lightMode }: { lightMode: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`ml-1 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${
        lightMode
          ? "border-zinc-900/10 bg-zinc-950/6 text-zinc-700 hover:bg-zinc-950/10 hover:text-zinc-950"
          : "border-white/10 bg-white/4 text-zinc-300 hover:border-white/15 hover:bg-white/8 hover:text-white"
      }`}
    >
      {!pending ? <LogoutIcon /> : null}
      {pending ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-zinc-400/40 border-t-zinc-200" />
      ) : null}
      {pending ? "Đang thoát…" : "Thoát"}
    </button>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("gram-theme", nextTheme);
  }

  const lightMode = theme === "light";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-zinc-950/70 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-18 max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Link href="/" className={`flex items-center gap-3 ${lightMode ? "text-zinc-950" : "text-white"}`}>
          <Image src="/logo.png" alt="HT" width={32} height={32} />
          <span>
            <span className={`block text-xs ${lightMode ? "text-zinc-500" : "text-zinc-400"}`}>A place to preserve memories</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          {navLink("/", "Trang chủ", pathname, <HomeIcon />, lightMode)}
          {navLink("/post/new", "Đăng bài", pathname, <PlusIcon />, lightMode)}
          {navLink("/profile/edit", "Hồ sơ", pathname, <UserIcon />, lightMode)}
          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
              lightMode
                ? "border-zinc-900/10 bg-zinc-950/6 text-zinc-700 hover:bg-zinc-950/10 hover:text-zinc-950"
                : "border-white/10 bg-white/4 text-zinc-300 hover:border-white/15 hover:bg-white/8 hover:text-white"
            }`}
            aria-label={lightMode ? "Chuyển sang dark mode" : "Chuyển sang light mode"}
          >
            {lightMode ? <MoonIcon /> : <SunIcon />}
            {lightMode ? "Dark" : "Light"}
          </button>
          <form action={logoutAction}>
            <LogoutButton lightMode={lightMode} />
          </form>
        </nav>
      </div>
    </header>
  );
}
