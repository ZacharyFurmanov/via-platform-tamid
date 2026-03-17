import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes accessible without any authentication or approval
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/pilot-pending",
  "/api/pilot-register",
  "/api/pilot-check",
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
  "/api/admin/purge-store",
  "/api/admin/send-new-arrivals",
  "/api/editors-picks",
  "/api/admin/editors-picks",
  "/api/admin/test-pilot-email",
  "/api/admin/test-waitlist-email",
  "/api/admin/test-abandoned-cart",
  "/api/admin/test-trending-item",
  "/api/admin/approve-waitlist",
  "/api/admin/approve-stores",
  "/api/admin/delete-product",
  "/api/store/me",
  "/api/store/analytics",
  "/api/store/sourcing",
  "/store/login",
];

// Routes that require a user session but NOT pilot approval (via_access cookie)
const SESSION_ONLY_ROUTES = [
  "/account",
  "/api/favorites",
  "/api/account",
  "/api/friends",
  "/api/membership",
  "/api/referral-status",
  "/store/dashboard",
  "/products",
  "/stores",
  "/categories",
];

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

function isPublicRoute(pathname: string): boolean {
  const normalized =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  return PUBLIC_ROUTES.some(
    (route) => normalized === route || normalized.startsWith(route + "/")
  );
}

function isSessionOnlyRoute(pathname: string): boolean {
  const normalized =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  return SESSION_ONLY_ROUTES.some(
    (route) => normalized === route || normalized.startsWith(route + "/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const fullPath = pathname + search;

  // Allow public routes unconditionally
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Admin routes
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

  // Session-only routes (account, favorites, etc.) — need session but not via_access
  if (isSessionOnlyRoute(pathname)) {
    if (!hasUserSession(request)) {
      if (pathname.startsWith("/store/")) {
        return NextResponse.redirect(new URL("/store/login", request.url));
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", fullPath);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // All other routes: require session + pilot approval (via_access cookie)
  if (!hasUserSession(request) && !isAdminAuthenticated(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", fullPath);
    return NextResponse.redirect(loginUrl);
  }

  // Has session but no approval cookie → run pilot check
  if (hasUserSession(request) && !hasAccessCode(request) && !isAdminAuthenticated(request)) {
    const checkUrl = new URL("/api/pilot-check", request.url);
    checkUrl.searchParams.set("next", fullPath);
    return NextResponse.redirect(checkUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};
