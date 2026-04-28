import { AppNav } from "@/app/components/AppNav";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full text-zinc-100">
      <AppNav />
      <main className="mx-auto w-full max-w-5xl px-3 pb-20 pt-28 sm:px-4 md:px-6">{children}</main>
    </div>
  );
}
