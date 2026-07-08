import { NextRequest, NextResponse } from "next/server";
import { etsyExchangeCode, etsyVerifyState } from "@/app/lib/etsy";

export const dynamic = "force-dynamic";

// Etsy redirects here after consent. Verify the signed state, read the PKCE verifier cookie,
// exchange the code for tokens, and bounce back to the Cross-listing tab.
export async function GET(request: NextRequest) {
 const sp = request.nextUrl.searchParams;
 const code = sp.get("code");
 const state = sp.get("state") || "";
 const back = new URL("/infrastructure/admin/cross-listing", request.url);

 const slug = etsyVerifyState(state);
 const verifier = request.cookies.get("etsy_pkce")?.value;
 if (!code || !slug || !verifier) {
 back.searchParams.set("etsy", "error");
 return NextResponse.redirect(back);
 }
 const ok = await etsyExchangeCode(slug, code, verifier).catch(() => false);
 back.searchParams.set("etsy", ok ? "connected" : "error");
 const res = NextResponse.redirect(back);
 res.cookies.delete("etsy_pkce");
 return res;
}
