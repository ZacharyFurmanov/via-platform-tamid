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
          NULL  AS first_name,
          NULL  AS last_name,
          NULL  AS phone,
          'waitlist' AS status,
          w.signup_date AS created_at,
          NULL  AS approved_at,
          NULL  AS referral_code,
          NULL  AS referred_by,
          FALSE AS email_subscribe
        FROM waitlist w
        WHERE LOWER(w.email) NOT IN (SELECT LOWER(email) FROM pilot_access)
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
        u.id   AS user_id,
        STRING_AGG(DISTINCT a.provider, ',') AS providers,
        COALESCE((SELECT COUNT(*) FROM product_favorites pf WHERE pf.user_id = u.id), 0) +
        COALESCE((SELECT COUNT(*) FROM user_cart_items ci WHERE ci.user_id = u.id::text OR ci.user_id::text = u.id::text), 0) +
        COALESCE((SELECT COUNT(*) FROM clicks cl WHERE cl.user_id = u.id::text), 0) +
        COALESCE((SELECT COUNT(*) FROM conversions cv WHERE cv.user_id = u.id::text), 0) AS activity_score
      FROM all_customers ac
      LEFT JOIN users u ON LOWER(u.email) = LOWER(ac.email)
      LEFT JOIN accounts a ON a.user_id = u.id
      GROUP BY
        ac.email, ac.first_name, ac.last_name, ac.phone,
        ac.status, ac.created_at, ac.approved_at,
        ac.referral_code, ac.referred_by, ac.email_subscribe,
        u.name, u.id
      ORDER BY activity_score DESC, ac.created_at DESC
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
        loginMethod,
        emailSubscribe: r.email_subscribe as boolean,
        activityScore: Number(r.activity_score ?? 0),
      };
    });

    return NextResponse.json({ customers }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    console.error("[admin/customers]", error);
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
  }
}
