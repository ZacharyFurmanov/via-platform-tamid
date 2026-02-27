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
  "/api/auth",
  "/api/newsletter",
  "/api/track",
  "/api/conversion",
  "/api/access-code",
  "/membership",
  "/api/webhooks/stripe",
  "/api/admin/collabs-product-ids",
  "/api/admin/import-collabs-links",
  "/api/admin/import-collabs-links-by-shopify-id",
];

// Routes that require the access code cookie but not a full user session
const ACCESS_CODE_ROUTES = [
  "/login",
  "/",
  "/stores",
  "/categories",
  "/browse",
  "/products",
  "/stories",
  "/faqs",
  "/search",
  "/cart",
];

// Routes that require user authentication (Auth.js session)
// Now all non-public, non-admin routes require auth
const USER_AUTH_ROUTES = ["/account", "/api/favorites", "/api/account", "/api/friends", "/api/membership"];

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

function hasAccessCode(request: NextRequest): boolean {
  return request.cookies.get("via_access")?.value === "1";
}

function isAccessCodeRoute(pathname: string): boolean {
  const normalizedPath =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  return ACCESS_CODE_ROUTES.some(
    (route) => normalizedPath === route || normalizedPath.startsWith(route + "/")
  );
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

  // TEMPORARILY DISABLED — all routes open for Figma screenshots
  // Admin routes still require auth
  if (pathname.startsWith("/admin")) {
    if (!isAdminAuthenticated(request)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname === "/admin" || pathname === "/admin/") {
      return NextResponse.redirect(new URL("/admin/sync", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
