import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getSellerBySlug } from "@/app/lib/db/sellers";
import { markSold } from "@/app/lib/db/inventory";
import {
 PLATFORMS, getPlatformAccounts, upsertPlatformAccount, removePlatformAccount,
 getCrossListBoard, delistEverywhere, platformByKey,
} from "@/app/lib/cross-listing-db";
import { ebayConfigured } from "@/app/lib/ebay";
import { getEbayTokens, clearEbayTokens } from "@/app/lib/ebay-tokens-db";
import { depopConfigured } from "@/app/lib/depop";
import { getDepopTokens, clearDepopTokens } from "@/app/lib/depop-tokens-db";

export const dynamic = "force-dynamic";

// GET — connected platforms + the cross-listing board (items × platform status).
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const [accounts, board, ebayTok, depopTok] = await Promise.all([getPlatformAccounts(slug), getCrossListBoard(slug), getEbayTokens(slug).catch(() => null), getDepopTokens(slug).catch(() => null)]);
 return NextResponse.json({
 ok: true,
 platforms: PLATFORMS.filter((p) => p.live).map((p) => ({ key: p.key, name: p.name, hasApi: p.hasApi })),
 accounts,
 board,
 ebay: { configured: ebayConfigured(), connected: !!ebayTok, user: ebayTok?.ebayUser || null },
 depop: { configured: depopConfigured(), connected: !!depopTok, user: depopTok?.depopUser || null },
 });
}

// POST — connect/update a platform account. { platform, handle, autoList? }
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const b = await request.json().catch(() => ({}));
 const platform = String(b?.platform || "");
 const handle = String(b?.handle || "").trim();
 if (!platformByKey(platform)) return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
 if (!handle) return NextResponse.json({ error: "Enter your handle on that platform." }, { status: 400 });
 await upsertPlatformAccount(slug, platform, handle, b?.autoList !== false);
 return NextResponse.json({ ok: true, accounts: await getPlatformAccounts(slug) });
}

// DELETE ?platform= — disconnect a platform.
export async function DELETE(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const platform = new URL(request.url).searchParams.get("platform") || "";
 if (platform === "ebay") { await clearEbayTokens(slug); return NextResponse.json({ ok: true, accounts: await getPlatformAccounts(slug) }); }
 if (platform === "depop") { await clearDepopTokens(slug); return NextResponse.json({ ok: true, accounts: await getPlatformAccounts(slug) }); }
 await removePlatformAccount(slug, platform);
 return NextResponse.json({ ok: true, accounts: await getPlatformAccounts(slug) });
}

// PATCH — it sold somewhere; pull it everywhere. { itemId, platform } (platform = where
// it sold: "vya" or a marketplace key). Marks the item sold on VYA + delists the rest.
export async function PATCH(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const b = await request.json().catch(() => ({}));
 const itemId = String(b?.itemId || "");
 const soldOn = String(b?.platform || "");
 if (!itemId || !soldOn) return NextResponse.json({ error: "itemId + platform required" }, { status: 400 });
 // If it sold off-VYA, take it out of VYA inventory too.
 if (soldOn !== "vya") {
 const seller = await getSellerBySlug(slug).catch(() => null);
 if (seller) await markSold(itemId).catch(() => {});
 }
 const toPull = await delistEverywhere(itemId, soldOn);
 return NextResponse.json({ ok: true, pullFrom: toPull });
}
