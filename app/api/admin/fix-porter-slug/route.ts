import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const adminToken = request.cookies.get("via_admin_token")?.value;
 if (!adminToken) return false;
 const expected = crypto.createHash("sha256").update(adminPassword).digest("hex");
 return adminToken === expected;
}

const OLD = "porterspreloved";
const NEW = "porters-preloved";

export async function POST(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) return NextResponse.json({ error: "No database URL" }, { status: 500 });
 const sql = neon(url);

 const [products, conversions, clicks, storeFavs] = await Promise.all([
 sql`DELETE FROM products WHERE store_slug = ${OLD}`,
 sql`UPDATE conversions SET store_slug = ${NEW}, store_name = 'Porter''s Preloved' WHERE store_slug = ${OLD}`,
 sql`UPDATE clicks SET store_slug = ${NEW} WHERE store_slug = ${OLD}`,
 sql`UPDATE store_favorites SET store_slug = ${NEW} WHERE store_slug = ${OLD}`,
 ]);

 return NextResponse.json({
 success: true,
 productsDeleted: products.length ?? 0,
 conversionsUpdated: conversions.length ?? 0,
 clicksUpdated: clicks.length ?? 0,
 storeFavsUpdated: storeFavs.length ?? 0,
 });
}
