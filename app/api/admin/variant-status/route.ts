import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/app/lib/firebase-db";
import { isAdminRequestAuthorized } from "@/app/lib/admin-auth";

type ProductRow = {
  store_slug?: string;
  store_name?: string;
  variant_id?: string | null;
  shopify_product_id?: string | null;
  collabs_link?: string | null;
};

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snaps = await getDocs(collection(getDb(), "products"));

    const grouped = new Map<
      string,
      {
        store_slug: string;
        store_name: string;
        total: number;
        with_variant_id: number;
        with_shopify_product_id: number;
        with_collabs_link: number;
      }
    >();

    for (const snap of snaps.docs) {
      const row = snap.data() as ProductRow;
      if (!row.store_slug || !row.store_name) continue;

      const key = `${row.store_slug}__${row.store_name}`;
      const existing = grouped.get(key) || {
        store_slug: row.store_slug,
        store_name: row.store_name,
        total: 0,
        with_variant_id: 0,
        with_shopify_product_id: 0,
        with_collabs_link: 0,
      };

      existing.total += 1;
      if (row.variant_id) existing.with_variant_id += 1;
      if (row.shopify_product_id) existing.with_shopify_product_id += 1;
      if (row.collabs_link) existing.with_collabs_link += 1;

      grouped.set(key, existing);
    }

    const rows = Array.from(grouped.values())
      .map((row) => ({
        store_slug: row.store_slug,
        store_name: row.store_name,
        total: row.total,
        with_variant_id: row.with_variant_id,
        missing_variant_id: row.total - row.with_variant_id,
        with_shopify_product_id: row.with_shopify_product_id,
        missing_shopify_product_id: row.total - row.with_shopify_product_id,
        with_collabs_link: row.with_collabs_link,
      }))
      .sort((a, b) => a.store_name.localeCompare(b.store_name));

    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
