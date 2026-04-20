"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/lib/actions";

function navLink(href: string, label: string, pathname: string) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-white/14 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
          : "text-zinc-300 hover:bg-white/8 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/8 hover:text-white disabled:opacity-50"
    >
      {pending ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-zinc-400/40 border-t-zinc-200" />
      ) : null}
      {pending ? "Đang thoát…" : "Thoát"}
    </button>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-zinc-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Gram
        </Link>
        <nav className="flex items-center gap-1.5">
          {navLink("/", "Trang chủ", pathname)}
          {navLink("/post/new", "Đăng bài", pathname)}
          {navLink("/profile/edit", "Hồ sơ", pathname)}
          <form action={logoutAction}>
            <LogoutButton />
          </form>
        </nav>
      </div>
    </header>
  );
}
