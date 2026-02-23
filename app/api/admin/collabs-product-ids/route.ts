import { NextResponse } from "next/server";
import { getProductsMissingCollabsLink } from "@/app/lib/db";
import { stores } from "@/app/lib/stores";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://collabs.shopify.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const COLLABS_STORE_SLUGS = new Set(
  stores.filter((s) => "affiliatePath" in s).map((s) => s.slug)
);

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const products = await getProductsMissingCollabsLink();
  const filtered = products.filter((p) => COLLABS_STORE_SLUGS.has(p.store_slug));

  return NextResponse.json(
    {
      products: filtered.map((p) => ({
        id: p.id,
        shopifyProductId: p.shopify_product_id,
        title: p.title,
        storeSlug: p.store_slug,
      })),
    },
    { headers: CORS_HEADERS }
  );
}
