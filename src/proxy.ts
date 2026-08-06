import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Edge proxy — Next.js 16's renamed `middleware` (PROXY_FILENAME = "proxy").
 *
 * OPTIMISTIC by design: `getSessionCookie` only confirms a Better Auth session
 * cookie is PRESENT — it does not validate it against the database (that needs
 * Node + Prisma and cannot run on the Edge). Real validation stays in-page via
 * `getServerSession()`, which correctly rejects a present-but-expired cookie.
 * The proxy's job is to turn "developer forgot the guard" into a cheap redirect.
 *
 * EDGE-SAFE: imports only `next/server` and `better-auth/cookies`. Never import
 * @/lib/prisma, @/lib/auth, or any Node module here — it breaks the Edge build.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the destination; run it through sanitizeRedirect before use.
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // List each protected route BARE and WILDCARDED so the base URL is always
  // covered. Adding a protected route = both entries + the in-page guard.
  // /checkout is deliberately NOT matched — checkout supports guest orders.
  matcher: ["/my-orders", "/my-orders/:path*"],
};
