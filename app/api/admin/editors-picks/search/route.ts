import { NextRequest, NextResponse } from "next/server";
import { searchProducts, getProductsByStore } from "@/app/lib/editors-picks-db";
import { isAdminRequestAuthorized } from "@/app/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthorized(request)) {
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
    // No query, no store → return empty
    return NextResponse.json({ products: [] });
  } catch (error) {
    console.error("Product search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
