import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gram",
  description: "Instagram clone — đăng nhập, hồ sơ, bài đăng",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`try{var saved=localStorage.getItem("gram-theme");var theme=saved==="light"||saved==="dark"?saved:"dark";document.documentElement.dataset.theme=theme;}catch(e){document.documentElement.dataset.theme="dark";}`}</Script>
      </head>
      <body className="flex min-h-full flex-col bg-black text-zinc-100">{children}</body>
    </html>
  );
}
