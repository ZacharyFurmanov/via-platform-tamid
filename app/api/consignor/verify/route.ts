import { NextResponse } from "next/server";
import { consumeMagicLinkToken } from "@/app/lib/mobileAuth";
import { signConsignorSession, CONSIGNOR_COOKIE } from "@/app/lib/consignor-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The magic link lands here: validate the one-time token, then set the session cookie and send
// them to their statement.
export async function GET(request: Request) {
 const url = new URL(request.url);
 const token = url.searchParams.get("token") || "";
 const email = token ? await consumeMagicLinkToken(token) : null;
 if (!email) return NextResponse.redirect(new URL("/consignor?error=expired", url.origin));
 const res = NextResponse.redirect(new URL("/consignor", url.origin));
 res.cookies.set(CONSIGNOR_COOKIE, signConsignorSession(email), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
 return res;
}
