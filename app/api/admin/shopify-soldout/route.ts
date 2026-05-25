import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ALL_STORES } from "@/app/lib/storeConfig";

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  if (request.headers.get("authorization") === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

// Fetch all pages of /products.json from a Shopify store
async function fetchAllShopifyProducts(domain: string): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const url = `https://${domain}/products.json?limit=250&page=${page}`;
    const res = await fetch(url, { headers: { "User-Agent": "VYA-Admin/1.0" } });
    if (!res.ok) break;
    const data = await res.json();
    const products: any[] = data.products ?? [];
    if (products.length === 0) break;
    all.push(...products);
    if (products.length < 250) break;
    page++;
  }
  return all;
}

// GET /api/admin/shopify-soldout?store=scarz-vintage&price=200&currency=GBP
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeSlug = request.nextUrl.searchParams.get("store");
  const priceParam = request.nextUrl.searchParams.get("price");
  const currency = request.nextUrl.searchParams.get("currency") ?? "USD";

  if (!storeSlug) return NextResponse.json({ error: "store is required" }, { status: 400 });

  const storeConfig = ALL_STORES.find(
    (s) => s.type === "shopify" && s.slug === storeSlug
  ) as { storeDomain: string } | undefined;

  if (!storeConfig) {
    return NextResponse.json({ error: `No Shopify config found for store: ${storeSlug}` }, { status: 404 });
  }

  const domain = storeConfig.storeDomain;

  let products: any[];
  try {
    products = await fetchAllShopifyProducts(domain);
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch from ${domain}: ${err}` }, { status: 502 });
  }

  // A product is sold out if every variant is unavailable
  const soldOut = products.filter((p) => {
    const variants: any[] = p.variants ?? [];
    return variants.length > 0 && variants.every((v) => !v.available);
  });

  // Optionally filter by price proximity (±30%)
  let filtered = soldOut;
  if (priceParam) {
    const target = parseFloat(priceParam);
    if (!isNaN(target) && target > 0) {
      const lo = target * 0.7;
      const hi = target * 1.3;
      filtered = soldOut.filter((p) => {
        const price = parseFloat(p.variants?.[0]?.price ?? "0");
        return price >= lo && price <= hi;
      });
    }
  }

  const result = filtered.map((p) => ({
    title: p.title as string,
    price: parseFloat(p.variants?.[0]?.price ?? "0"),
    currency,
    image: (p.images?.[0]?.src as string | null) ?? null,
    handle: p.handle as string,
    url: `https://${domain}/products/${p.handle}`,
  }));

  // Sort by price descending
  result.sort((a, b) => b.price - a.price);

  return NextResponse.json({ products: result, total: soldOut.length, domain });
}
