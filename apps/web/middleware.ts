import { NextResponse, type NextRequest } from "next/server";

export const COOKIE_NAME = "prochar_token";

const PROTECTED_PREFIXES = ["/templates", "/create", "/posters"];

/**
 * Route protection middleware (UX layer).
 * The API remains the source of truth; middleware checks cookie presence to redirect
 * unauthenticated users to /login?next=<original-path>.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    const token = request.cookies.get(COOKIE_NAME);
    if (!token || !token.value) {
      const loginUrl = new URL("/login", request.url);
      const originalPath = `${pathname}${search}`;
      loginUrl.searchParams.set("next", originalPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/templates",
    "/templates/:path*",
    "/create",
    "/create/:path*",
    "/posters",
    "/posters/:path*",
  ],
};
