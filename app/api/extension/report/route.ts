import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { markCrossListing } from "@/app/lib/cross-listing-db";

export const dynamic = "force-dynamic";

// The extension reports back after it lists (or fails to list) an item on Depop, so VYA's
// cross_listings board reflects reality and delist-on-sale knows where the item lives.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const body = (await request.json().catch(() => null)) as { itemId?: string; status?: string; url?: string | null } | null;
 if (!body?.itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

 const status = body.status === "listed" ? "listed" : body.status === "pending" ? "pending" : "error";
 await markCrossListing(slug, body.itemId, "depop", status, body.url ?? null);
 return NextResponse.json({ ok: true });
}
