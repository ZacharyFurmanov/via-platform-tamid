import { NextRequest, NextResponse } from "next/server";
import { klaviyoExchangeCode, verifyAuth, signKlaviyoState } from "@/app/lib/klaviyo";
import { saveKlaviyoOAuth } from "@/app/lib/klaviyo-db";

export const dynamic = "force-dynamic";

const APPS = "/infrastructure/admin/apps";

// GET — Klaviyo redirects here after the store approves. Exchange the code for tokens + save.
export async function GET(request: NextRequest) {
 const url = new URL(request.url);
 const code = url.searchParams.get("code");
 const state = url.searchParams.get("state") || "";
 const slug = state.split(".")[0];
 const done = (q: string) => NextResponse.redirect(new URL(`${APPS}?klaviyo=${q}`, request.url));

 if (!code || !slug || state !== signKlaviyoState(slug)) return done("error");
 const verifier = request.cookies.get("klaviyo_pkce")?.value;
 if (!verifier) return done("error");

 const redirectUri = new URL("/api/store/klaviyo/callback", request.url).toString();
 const tokens = await klaviyoExchangeCode({ code, codeVerifier: verifier, redirectUri });
 if (!tokens) return done("error");

 const acct = await verifyAuth(`Bearer ${tokens.accessToken}`);
 await saveKlaviyoOAuth(slug, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresInSec: tokens.expiresIn, accountName: acct.accountName });

 const res = done("connected");
 res.cookies.delete("klaviyo_pkce");
 return res;
}
