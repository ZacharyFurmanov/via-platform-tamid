import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { ebayAuthUrl, ebayConfigured, ebaySignState } from "@/app/lib/ebay";

export const dynamic = "force-dynamic";

// GET — kick off the eBay account connection (redirect to eBay's consent screen).
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 if (!ebayConfigured()) return NextResponse.json({ error: "eBay isn’t configured on the server yet (missing EBAY_CLIENT_ID / EBAY_CLIENT_SECRET / EBAY_RU_NAME)." }, { status: 503 });
 return NextResponse.redirect(ebayAuthUrl(ebaySignState(slug)));
}
