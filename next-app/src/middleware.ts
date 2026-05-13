import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "gos_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = process.env.APP_SESSION_TOKEN;

  if (!token) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const authed = cookie === token;

  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    if (authed && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (authed) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + req.nextUrl.search);

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
