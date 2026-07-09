import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getListingsByStore } from "@/app/lib/listings-db";
import { crossPostContent } from "@/app/lib/cross-listing-db";

export const dynamic = "force-dynamic";

// The VYA Cross-Lister browser extension calls this (with the seller's vyaplatform.com session
// cookie) to get their active listings, each pre-formatted for Depop — title, caption+hashtags,
// price, and image URLs — so the extension can fill the seller's own Depop sell form. No Depop API
// is involved; the extension automates the seller's logged-in session (the only way Depop allows).
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Log into vyaplatform.com first." }, { status: 401 });

 const listings = await getListingsByStore(slug, true).catch(() => []);
 const items = listings.map((l) => {
 const c = crossPostContent(
 { title: l.title, size: l.size, category: l.category, priceCents: Math.round(l.price * 100), description: l.description },
 "depop",
 );
 return {
 id: l.id,
 title: c.title,
 body: c.body, // caption with inline #hashtags — Depop's "description" field
 tags: c.tags,
 priceDollars: Math.round(l.price),
 size: l.size,
 category: l.category,
 images: Array.isArray(l.images) ? l.images.slice(0, 8) : [],
 };
 });

 return NextResponse.json({ ok: true, store: slug, platform: "depop", count: items.length, items });
}
