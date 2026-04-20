"use client";

import { useActionState } from "react";
import { registerAction, type ActionState } from "@/lib/actions";

const initial: ActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="username" className="mb-1 block text-sm text-zinc-400">
          Tên đăng nhập
        </label>
        <input
          id="username"
          name="username"
          required
          minLength={3}
          autoComplete="username"
          className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-zinc-400">
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none ring-sky-500 focus:ring-2"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
      >
        {pending ? "Đang tạo…" : "Tạo tài khoản"}
      </button>
    </form>
  );
}
