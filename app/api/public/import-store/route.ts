import { NextResponse } from "next/server";
import { importStoreFromUrl } from "@/app/lib/store-import";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

// Live "import a site" preview for the /infrastructure builder. Pulls a real
// Shopify/Squarespace storefront server-side and returns name + brand color +
// products. (The real seller import that *persists* a VYA store is /api/store/import.)
export async function GET(request: Request) {
 const { searchParams } = new URL(request.url);
 const raw = (searchParams.get("url") || "").trim();
 if (!raw) return NextResponse.json({ error: "url required" }, { status: 400 });

 const result = await importStoreFromUrl(raw, 12); // demo preview — a handful is enough
 const status = result.ok ? 200 : result.error === "Enter a valid store URL." ? 400 : 200;
 return NextResponse.json(result, { status });
}
