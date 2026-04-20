"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/lib/actions";

const initial: ActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Tên đăng nhập
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          className="w-full rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5 text-white outline-none ring-sky-500/80 placeholder:text-zinc-500 focus:border-sky-500/50 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5 text-white outline-none ring-sky-500/80 placeholder:text-zinc-500 focus:border-sky-500/50 focus:ring-2"
        />
      </div>
      {state.error ? (
        <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Đang xử lý…" : "Đăng nhập"}
      </button>
    </form>
  );
}
