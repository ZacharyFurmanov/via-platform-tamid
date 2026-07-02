import { NextRequest, NextResponse } from "next/server";
import { getShopperFavorites } from "@/app/lib/store-favorites-db";

export const dynamic = "force-dynamic";

function withCors(req: NextRequest, res: NextResponse): NextResponse {
 res.headers.set("Access-Control-Allow-Origin", req.headers.get("origin") || "*");
 res.headers.set("Access-Control-Allow-Credentials", "true");
 res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
 res.headers.set("Access-Control-Allow-Headers", "Content-Type");
 return res;
}

export async function OPTIONS(req: NextRequest) {
 return withCors(req, new NextResponse(null, { status: 204 }));
}

// GET ?slug= — the current shopper's saved items on a store (from the via_shopper cookie).
export async function GET(req: NextRequest) {
 const slug = req.nextUrl.searchParams.get("slug") || "";
 const shopperId = req.cookies.get("via_shopper")?.value || "";
 if (!slug) return withCors(req, NextResponse.json({ error: "slug required" }, { status: 400 }));
 if (!shopperId) return withCors(req, NextResponse.json({ ok: true, favorites: [] }));
 const favorites = await getShopperFavorites(slug, shopperId);
 return withCors(req, NextResponse.json({ ok: true, favorites }));
}
