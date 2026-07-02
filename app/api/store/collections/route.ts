import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getSellerBySlug } from "@/app/lib/db/sellers";
import { listCollections } from "@/app/lib/db/collections";

export const dynamic = "force-dynamic";

// GET — the store's collections (with live item counts), for the listing picker.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const seller = await getSellerBySlug(slug);
 if (!seller) return NextResponse.json({ collections: [] });
 const cols = await listCollections(seller.id);
 return NextResponse.json({ collections: cols.map((c) => ({ id: c.id, title: c.title, slug: c.slug, itemCount: c.itemCount })) });
}
