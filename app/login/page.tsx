import { LoginForm } from "./ui";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-16 text-zinc-100">
      <div className="w-full max-w-md rounded-3xl border border-white/12 bg-zinc-950/85 p-8 shadow-2xl shadow-black/55 backdrop-blur-xl">
        <h1 className="text-center text-3xl font-semibold text-white">Đăng nhập</h1>
        <p className="mt-2 text-center text-sm text-zinc-400">Gram — bản cá nhân</p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-6 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-center text-xs text-zinc-400">
          Tài khoản cố định:{" "}
          <span className="font-medium tracking-wide text-zinc-200">Youyue1314 / ht161723!</span>
        </p>
      </div>
    </div>
  );
}
