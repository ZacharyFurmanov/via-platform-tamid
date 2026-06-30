import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

function getDb() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL not set");
 return neon(url);
}

function hashPassword(password: string): string {
 return crypto.createHash("sha256").update(password).digest("hex");
}

function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const adminToken = request.cookies.get("via_admin_token")?.value;
 return !!adminToken && adminToken === hashPassword(adminPassword);
}

export async function GET(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 try {
 const sql = getDb();

 // Union pilot_access + waitlist, deduped by email (pilot_access takes priority)
 // Then join with users/accounts for login method
 const rows = await sql`
 WITH all_customers AS (
 SELECT
 pa.email,
 pa.first_name,
 pa.last_name,
 pa.phone,
 pa.status,
 pa.created_at,
 pa.approved_at,
 pa.referral_code,
 pa.referred_by,
 pa.email_subscribe
 FROM pilot_access pa
 UNION
 SELECT
 w.email,
 NULL AS first_name,
 NULL AS last_name,
 NULL AS phone,
 'waitlist' AS status,
 w.signup_date AS created_at,
 NULL AS approved_at,
 NULL AS referral_code,
 NULL AS referred_by,
 FALSE AS email_subscribe
 FROM waitlist w
 WHERE LOWER(w.email) NOT IN (SELECT LOWER(email) FROM pilot_access)
 ),
 fav_counts AS (SELECT user_id::text AS uid, COUNT(*) AS cnt, MAX(created_at) AS last_at FROM product_favorites WHERE user_id IS NOT NULL GROUP BY user_id::text),
 cart_counts AS (SELECT user_id::text AS uid, COUNT(*) AS cnt, MAX(added_at) AS last_at FROM user_cart_items WHERE user_id IS NOT NULL GROUP BY user_id::text),
 click_counts AS (SELECT user_id::text AS uid, COUNT(*) AS cnt, MAX(timestamp) AS last_at FROM clicks WHERE user_id IS NOT NULL GROUP BY user_id::text),
 view_counts AS (SELECT user_id::text AS uid, COUNT(*) AS cnt, MAX(timestamp) AS last_at FROM product_views WHERE user_id IS NOT NULL GROUP BY user_id::text),
 order_counts AS (SELECT user_id::text AS uid, COUNT(*) AS cnt, MAX(timestamp) AS last_at FROM conversions WHERE order_total > 0 AND user_id IS NOT NULL GROUP BY user_id::text),
 page_counts AS (SELECT user_id::text AS uid, COUNT(*) AS cnt, MAX(timestamp) AS last_at FROM page_type_views WHERE user_id IS NOT NULL GROUP BY user_id::text),
 ltv_amounts AS (SELECT user_id::text AS uid, SUM(order_total) AS total FROM conversions WHERE order_total > 0 AND user_id IS NOT NULL GROUP BY user_id::text),
 -- Prefer the earliest NON-direct source: ordinary return visits get logged as
 -- "direct", so picking strictly the earliest visit would mask a real source we
 -- captured on another visit. Real sources sort first; "direct" only wins if it's
 -- genuinely all we have.
 first_source AS (
  SELECT DISTINCT ON (user_id) user_id AS uid, utm_source AS source
  FROM utm_visits
  WHERE user_id IS NOT NULL
  ORDER BY user_id,
   CASE
    WHEN utm_source IS NULL OR lower(utm_source) IN ('direct', '') THEN 2
    WHEN lower(utm_source) IN ('safari', 'chrome', 'firefox', 'edge', 'samsung', 'web') THEN 1
    ELSE 0
   END,
   timestamp ASC
 )
 SELECT
 ac.email,
 ac.first_name,
 ac.last_name,
 ac.phone,
 ac.status,
 ac.created_at,
 ac.approved_at,
 ac.referral_code,
 ac.referred_by,
 ac.email_subscribe,
 u.name AS user_name,
 u.id AS user_id,
 STRING_AGG(DISTINCT a.provider, ',') AS providers,
 COALESCE(MAX(fav.cnt), 0) +
 COALESCE(MAX(cart.cnt), 0) +
 COALESCE(MAX(clk.cnt), 0) +
 COALESCE(MAX(vw.cnt), 0) +
 COALESCE(MAX(ord.cnt), 0) AS activity_score,
 COALESCE(MAX(clk.cnt), 0) AS click_count,
 COALESCE(MAX(vw.cnt), 0) AS view_count,
 COALESCE(MAX(fav.cnt), 0) AS favorite_count,
 COALESCE(MAX(cart.cnt), 0) AS cart_count,
 COALESCE(MAX(ord.cnt), 0) AS order_count,
 COALESCE(MAX(pg.cnt), 0) AS page_view_count,
 COALESCE(MAX(ltv.total), 0) AS total_spend,
 MAX(fs.source) AS source,
 GREATEST(
 MAX(clk.last_at),
 MAX(vw.last_at),
 MAX(fav.last_at),
 MAX(cart.last_at),
 MAX(ord.last_at),
 MAX(pg.last_at)
 ) AS last_active_at
 FROM all_customers ac
 LEFT JOIN users u ON LOWER(u.email) = LOWER(ac.email)
 LEFT JOIN accounts a ON a.user_id = u.id
 LEFT JOIN fav_counts fav ON fav.uid = u.id::text
 LEFT JOIN cart_counts cart ON cart.uid = u.id::text
 LEFT JOIN click_counts clk ON clk.uid = u.id::text
 LEFT JOIN view_counts vw ON vw.uid = u.id::text
 LEFT JOIN order_counts ord ON ord.uid = u.id::text
 LEFT JOIN page_counts pg ON pg.uid = u.id::text
 LEFT JOIN ltv_amounts ltv ON ltv.uid = u.id::text
 LEFT JOIN first_source fs ON fs.uid = u.id::text
 GROUP BY
 ac.email, ac.first_name, ac.last_name, ac.phone,
 ac.status, ac.created_at, ac.approved_at,
 ac.referral_code, ac.referred_by, ac.email_subscribe,
 u.name, u.id

 ORDER BY last_active_at DESC NULLS LAST, activity_score DESC, ac.created_at DESC
 `;

 const customers = rows.map((r) => {
 const firstName = (r.first_name as string | null) ?? "";
 const lastName = (r.last_name as string | null) ?? "";
 const displayName =
 [firstName, lastName].filter(Boolean).join(" ") ||
 (r.user_name as string | null) ||
 null;

 const providers = ((r.providers as string | null) ?? "").split(",").filter(Boolean);
 const loginMethod = providers.includes("google") ? "Google" : "Email";

 return {
 email: r.email as string,
 name: displayName,
 phone: (r.phone as string | null) ?? null,
 status: r.status as string,
 signedUpAt: r.created_at as string,
 approvedAt: (r.approved_at as string | null) ?? null,
 referralCode: (r.referral_code as string | null) ?? null,
 referredBy: (r.referred_by as string | null) ?? null,
 source: (() => {
 let s = (r.source as string | null) ?? null;
 if (!s && r.referred_by) s = "referral";
 if (!s) return null;
 const A: Record<string, string> = { ig: "instagram", fb: "facebook", tw: "twitter", tt: "tiktok", yt: "youtube", li: "linkedin" };
 s = s.toLowerCase();
 return A[s] ?? s;
 })(),
 loginMethod,
 emailSubscribe: r.email_subscribe as boolean,
 activityScore: Number(r.activity_score ?? 0),
 clickCount: Number(r.click_count ?? 0),
 viewCount: Number(r.view_count ?? 0),
 favoriteCount: Number(r.favorite_count ?? 0),
 cartCount: Number(r.cart_count ?? 0),
 orderCount: Number(r.order_count ?? 0),
 pageViewCount: Number(r.page_view_count ?? 0),
 totalSpend: Number(r.total_spend ?? 0),
 lastActiveAt: (r.last_active_at as string | null) ?? null,
 };
 });

 return NextResponse.json({ customers }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
 } catch (error) {
 console.error("[admin/customers]", error);
 return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
 }
}
