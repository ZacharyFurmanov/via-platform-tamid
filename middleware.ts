import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require user authentication (Auth.js session)
const USER_AUTH_ROUTES = ["/account"];

// Simple hash function for admin password comparison
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminToken = request.cookies.get("via_admin_token")?.value;
  const expectedToken = process.env.ADMIN_PASSWORD;

  if (!expectedToken || !adminToken) return false;
  return adminToken === hashPassword(expectedToken);
}

function hasUserSession(request: NextRequest): boolean {
  // Auth.js v5 stores JWT session in a cookie named authjs.session-token (or __Secure- prefix in production)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;
  return !!sessionToken;
}

function isUserAuthRoute(pathname: string): boolean {
  const normalizedPath =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;

  return USER_AUTH_ROUTES.some(
    (route) => normalizedPath === route || normalizedPath.startsWith(route + "/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect referral links to waitlist page with the giveaway modal
  const refCode = request.nextUrl.searchParams.get("ref");
  if (pathname === "/" && refCode) {
    const waitlistUrl = new URL("/waitlist", request.url);
    waitlistUrl.searchParams.set("ref", refCode);
    return NextResponse.redirect(waitlistUrl);
  }

  // Admin routes: require admin cookie
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAdminAuthenticated(request)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect /admin to the default admin page
    if (pathname === "/admin" || pathname === "/admin/") {
      return NextResponse.redirect(new URL("/admin/sync", request.url));
    }

    return NextResponse.next();
  }

  // User-auth routes: require Auth.js session
  if (isUserAuthRoute(pathname)) {
    if (!hasUserSession(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Everything else is public (browsing, API routes, auth routes, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
