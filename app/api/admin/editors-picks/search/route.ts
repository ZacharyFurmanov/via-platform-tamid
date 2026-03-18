import { NextRequest, NextResponse } from "next/server";
import { searchProducts, getProductsByStore, getAllProducts } from "@/app/lib/editors-picks-db";

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (adminToken && adminToken === hashPassword(adminPassword)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const store = searchParams.get("store") ?? "";

  try {
    // No query but store selected → browse all products for that store
    if (!q.trim() && store) {
      const products = await getProductsByStore(store);
      return NextResponse.json({ products });
    }
    // Query present → search (optionally filtered by store)
    if (q.trim()) {
      const products = await searchProducts(q.trim(), store || undefined);
      return NextResponse.json({ products });
    }
    // No query, no store → return all products
    const products = await getAllProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Product search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
