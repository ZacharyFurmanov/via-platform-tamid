import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes accessible without any authentication
const PUBLIC_ROUTES = [
  "/waitlist",
  "/api/waitlist",
  "/admin/login",
  "/api/admin/auth",
  "/terms",
  "/privacy",
  "/api/giveaway",
  "/api/cron",
  "/for-stores",
  "/login",
  "/api/auth",
  "/api/newsletter",
  "/api/track",
  "/api/conversion",
];

// Routes that require user authentication (Auth.js session)
const USER_AUTH_ROUTES = ["/account", "/api/favorites", "/api/account"];

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
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;
  return !!sessionToken;
}

function isPublicRoute(pathname: string): boolean {
  const normalizedPath =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;

  return PUBLIC_ROUTES.some(
    (route) => normalizedPath === route || normalizedPath.startsWith(route + "/")
  );
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

  // Allow public routes without auth
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Admin routes: require admin cookie
  if (pathname.startsWith("/admin")) {
    if (!isAdminAuthenticated(request)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

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

  // All other routes: require admin auth, otherwise redirect to waitlist
  if (!isAdminAuthenticated(request)) {
    const waitlistUrl = new URL("/waitlist", request.url);
    return NextResponse.redirect(waitlistUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
