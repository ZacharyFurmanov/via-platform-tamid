import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { stores } from "@/app/lib/stores";
import { getStorefrontBySlug } from "@/app/lib/storefront-db";
import { getListingsByStore } from "@/app/lib/listings-db";

export const dynamic = "force-dynamic";

// Has this store set up yet? Onboarded = storefront published OR has any listings.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const [sf, listings] = await Promise.all([
 getStorefrontBySlug(slug).catch(() => null),
 getListingsByStore(slug, false).catch(() => []),
 ]);
 const onboarded = Boolean(sf?.enabled) || listings.length > 0;
 const store = stores.find((s) => s.slug === slug);
 return NextResponse.json({ ok: true, onboarded, storeName: store?.name || slug });
}
