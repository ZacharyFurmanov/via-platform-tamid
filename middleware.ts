import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyRecipientTokenEdge } from "@/app/lib/recipientToken-edge";

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
  "/admin/set-password",
  "/api/admin/auth",
  "/api/admin/set-password",
  "/terms",
  "/privacy",
  "/api/giveaway",
  "/api/cron",
  "/api/test-emails",
  "/for-stores",
  "/partner-with-vya",
  "/infrastructure",
  "/api/auth",
  "/api/newsletter",
  "/api/track",
  "/api/conversion",
  "/api/access-code",
  "/api/promo-code",
  "/membership",
  "/api/webhooks",
  "/api/admin/collabs-product-ids",
  "/api/admin/import-collabs-links",
  "/api/admin/import-collabs-links-by-shopify-id",
  "/api/admin/purge-store",
  "/api/admin/send-new-arrivals",
  "/api/editors-picks",
  "/api/public",
  "/api/mobile",
  "/api/admin/editors-picks",
  "/api/store/me",
  "/api/store/analytics",
  "/api/store/sourcing",
  "/api/store/messages",
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
  "/cart",
  "/api/cart",
];

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  const expectedToken = process.env.ADMIN_PASSWORD;
  if (!expectedToken) return false;
  // Accept Bearer token in Authorization header (for curl/API access)
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${expectedToken}`) return true;
  // Accept hashed token in cookie (for browser sessions)
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (!adminToken) return false;
  const expected = await hashPassword(expectedToken);
  return adminToken === expected;
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
  // Product & store pages are gated (waitlist), but their OG/Twitter preview images
  // stay public so a shared link still unfurls with a thumbnail — clicking the link
  // itself hits the login/approval wall. (Locks access, keeps links from looking broken.)
  if (normalized.endsWith("/opengraph-image") || normalized.endsWith("/twitter-image")) return true;
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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const fullPath = pathname + search;

  // Per-recipient email attribution: a `?u=` token (from an email link) identifies the
  // subscriber who clicked. Persist it as a 30-day cookie so the eventual click-through
  // (/api/track) can record the click against them — even logged out, even before any
  // VYA session. verifyRecipientToken is cheap and rejects forged tokens. We only set
  // the cookie; downstream routing is unchanged.
  const uToken = request.nextUrl.searchParams.get("u");
  let eidValid = false;
  if (uToken) {
    try {
      eidValid = !!(await verifyRecipientTokenEdge(uToken));
    } catch {
      eidValid = false;
    }
  }
  const attachEid = (res: NextResponse): NextResponse => {
    if (eidValid && uToken) {
      res.cookies.set("via_eid", uToken, { maxAge: 60 * 60 * 24 * 30, path: "/", httpOnly: true, sameSite: "lax" });
    }
    return res;
  };

  // Redirect /waitlist to /login
  if (pathname === "/waitlist" || pathname.startsWith("/waitlist/")) {
    return attachEid(NextResponse.redirect(new URL("/login", request.url)));
  }

  // Waitlist guard: a logged-out visitor may view ONE product (the shared link
  // they arrived on), but can't browse into others. We remember the first product
  // they open in a 24h cookie; any different product sends them to login. OG/Twitter
  // preview images stay public so shared links still unfurl, and cookieless crawlers
  // are unaffected so products stay indexable.
  if (
    pathname.startsWith("/products/") &&
    !pathname.endsWith("/opengraph-image") &&
    !pathname.endsWith("/twitter-image") &&
    !hasUserSession(request) &&
    !hasAccessCode(request) &&
    !(await isAdminAuthenticated(request))
  ) {
    const seen = request.cookies.get("via_pv")?.value;
    if (seen && seen !== pathname) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", fullPath);
      return attachEid(NextResponse.redirect(loginUrl));
    }
    const res = attachEid(NextResponse.next());
    if (!seen) {
      res.cookies.set("via_pv", pathname, { maxAge: 60 * 60 * 24, path: "/", sameSite: "lax" });
    }
    return res;
  }

  // Allow public routes unconditionally
  if (isPublicRoute(pathname)) {
    return attachEid(NextResponse.next());
  }

  // Admin routes (browser UI + API)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!(await isAdminAuthenticated(request))) {
      // API admin routes return 401; browser admin routes redirect to login
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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

  const adminAuthed = await isAdminAuthenticated(request);

  // All other routes: require session + pilot approval (via_access cookie)
  if (!hasUserSession(request) && !adminAuthed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", fullPath);
    return attachEid(NextResponse.redirect(loginUrl));
  }

  // Has session but no approval cookie → run pilot check
  if (hasUserSession(request) && !hasAccessCode(request) && !adminAuthed) {
    const checkUrl = new URL("/api/pilot-check", request.url);
    checkUrl.searchParams.set("next", fullPath);
    return NextResponse.redirect(checkUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};
