import { AppNav } from "@/app/components/AppNav";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full text-zinc-100">
      <AppNav />
      <main className="mx-auto w-full max-w-xl px-3 pb-20 pt-18 sm:px-4">{children}</main>
    </div>
  );
}
