import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthSecret, SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Local dev: bypass auth entirely (no login required).
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/uploads") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token, getAuthSecret()) : null;

  if (PUBLIC_PATHS.has(pathname)) {
    if (userId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!userId) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
