import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/app/lib/base-url";
import { sendAbandonedCartEmail } from "@/app/lib/email";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const token = request.cookies.get("via_admin_token")?.value;
 return !!token && token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function GET(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 const sql = neon(url!);

 // Grab a real product with an image to use as the test
 const rows = await sql`
 SELECT id, title, image, store_name, store_slug, price
 FROM products
 WHERE image IS NOT NULL
 ORDER BY created_at DESC NULLS LAST
 LIMIT 1
 `;

 const p = rows[0] ?? {
 id: 1,
 title: "Vintage Item",
 image: null,
 store_name: "VYA Store",
 store_slug: "vya",
 price: 100,
 };

 const BASE_URL = getBaseUrl();

 await sendAbandonedCartEmail(
 "hana@vyaplatform.com",
 [{ productTitle: p.title, productImage: p.image, storeName: p.store_name, productUrl: `${BASE_URL}/products/${p.store_slug}-${p.id}`, price: Number(p.price), currency: "USD" }],
 );
 return NextResponse.json({ ok: true, sent: "hana@vyaplatform.com", product: p.title });
}
