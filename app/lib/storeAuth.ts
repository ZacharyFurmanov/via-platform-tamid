import { NextRequest } from "next/server";
import crypto from "crypto";
import { auth } from "./auth";
import { storeContactEmails } from "./stores";
import { getMobilePayload } from "./mobileAuth";

// ───────────────────────────────────────────────────────────────────────────
// Store-portal auth resolution. Normally the store is the logged-in partner
// (session email → slug). But an ADMIN can preview any store's portal exactly as
// that store sees it by passing ?store=<slug> — so admin views never drift from
// what sellers actually see (same endpoints, same code).
// ───────────────────────────────────────────────────────────────────────────

function hashPassword(p: string): string {
 return crypto.createHash("sha256").update(p).digest("hex");
}

export function isAdminRequest(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const token = request.cookies.get("via_admin_token")?.value;
 return !!token && token === hashPassword(adminPassword);
}

export function storeSlugFromEmail(email: string): string | null {
 for (const [slug, storeEmail] of Object.entries(storeContactEmails)) {
 if (storeEmail && storeEmail.toLowerCase() === email.toLowerCase()) return slug;
 }
 return null;
}

// The store this request is acting as: an admin preview (?store= + admin auth),
// otherwise the logged-in store partner. null if neither.
export async function resolveStoreSlug(request: NextRequest): Promise<string | null> {
 const preview = request.nextUrl.searchParams.get("store");
 if (preview && isAdminRequest(request)) return preview;
 const session = await auth();
 if (!session?.user?.email) return null;
 return storeSlugFromEmail(session.user.email);
}

/**
 * Resolve the acting store slug for an endpoint shared by the web store portal
 * AND the in-app store dashboard. Tries the web session/admin path first, then
 * falls back to the mobile JWT (the store partner signed into the app). Returns
 * null if the request isn't an authenticated store on either surface.
 */
export async function resolveStoreSlugAny(request: NextRequest): Promise<string | null> {
 const web = await resolveStoreSlug(request);
 if (web) return web;
 const payload = getMobilePayload(request);
 if (payload?.email) return storeSlugFromEmail(payload.email);
 return null;
}
