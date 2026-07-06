import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { klaviyoConfigured, klaviyoAuthUrl, makePkce, signKlaviyoState } from "@/app/lib/klaviyo";

export const dynamic = "force-dynamic";

const APPS = "/infrastructure/admin/apps";

// GET — kick off "Log in with Klaviyo" (OAuth authorization-code + PKCE).
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 if (!klaviyoConfigured()) return NextResponse.redirect(new URL(`${APPS}?klaviyo=unavailable`, request.url));

 const { verifier, challenge } = makePkce();
 const redirectUri = new URL("/api/store/klaviyo/callback", request.url).toString();
 const url = klaviyoAuthUrl({ redirectUri, state: signKlaviyoState(slug), codeChallenge: challenge });

 const res = NextResponse.redirect(url);
 res.cookies.set("klaviyo_pkce", verifier, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
 return res;
}
