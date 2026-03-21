import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function hashPassword(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === hashPassword(adminPassword);
}

// GET /api/admin/conversions/[id] — candidate clicks for matching
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);

  // Get the conversion
  const convRows = await sql`SELECT * FROM conversions WHERE conversion_id = ${id} LIMIT 1`;
  if (convRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const conv = convRows[0];

  const ts = conv.timestamp instanceof Date ? conv.timestamp : new Date(conv.timestamp as string);
  const windowStart = new Date(ts.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(ts.getTime() + 6 * 60 * 60 * 1000).toISOString();

  // Candidate clicks: same store, within 48h before + 6h after the order
  const clicks = await sql`
    SELECT cl.*, u.email AS user_email, u.name AS user_name
    FROM clicks cl
    LEFT JOIN users u ON u.id::text = cl.user_id
    WHERE cl.store_slug = ${conv.store_slug as string}
      AND cl.timestamp BETWEEN ${windowStart} AND ${windowEnd}
    ORDER BY ABS(EXTRACT(EPOCH FROM (cl.timestamp - ${ts.toISOString()}::timestamptz))) ASC
    LIMIT 50
  `;

  return NextResponse.json({
    clicks: clicks.map((c) => ({
      clickId: c.click_id,
      timestamp: c.timestamp instanceof Date ? c.timestamp.toISOString() : c.timestamp,
      productName: c.product_name,
      storeSlug: c.store_slug,
      userId: c.user_id ?? null,
      userEmail: c.user_email ?? null,
      userName: c.user_name ?? null,
    })),
  });
}

// POST /api/admin/conversions/[id] — manually match to a click or user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const { clickId, userId, userEmail } = await request.json();
  const sql = neon(dbUrl);

  // Resolve userEmail to userId if needed
  let resolvedUserId = userId;
  if (!resolvedUserId && userEmail) {
    const userRows = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${userEmail}) LIMIT 1`;
    resolvedUserId = userRows[0]?.id ? String(userRows[0].id) : null;
    if (!resolvedUserId) return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }

  if (clickId) {
    const clickRows = await sql`SELECT * FROM clicks WHERE click_id = ${clickId} LIMIT 1`;
    if (clickRows.length === 0) return NextResponse.json({ error: "Click not found" }, { status: 404 });
    const click = clickRows[0];

    const matchedClickData = {
      clickId: click.click_id,
      clickTimestamp: click.timestamp instanceof Date ? click.timestamp.toISOString() : click.timestamp,
      productName: click.product_name,
      source: "admin-manual",
    };

    await sql`
      UPDATE conversions SET
        matched = true,
        via_click_id = ${clickId},
        user_id = COALESCE(user_id, ${resolvedUserId ?? click.user_id ?? null}),
        matched_click_data = ${JSON.stringify(matchedClickData)}
      WHERE conversion_id = ${id}
    `;
  } else if (resolvedUserId) {
    // Match to a user without a specific click
    await sql`
      UPDATE conversions SET
        user_id = ${resolvedUserId},
        matched = true,
        matched_click_data = ${JSON.stringify({ source: "admin-manual-user", userId: resolvedUserId })}
      WHERE conversion_id = ${id}
    `;
  } else {
    return NextResponse.json({ error: "Provide clickId, userId, or userEmail" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// PUT — update order total
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { orderTotal } = await request.json();
  if (!orderTotal || isNaN(Number(orderTotal))) {
    return NextResponse.json({ error: "Valid orderTotal required" }, { status: 400 });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);
  await sql`UPDATE conversions SET order_total = ${Number(orderTotal)} WHERE conversion_id = ${id}`;

  return NextResponse.json({ ok: true });
}

// PATCH — unmatch a conversion (clear match data, keep record)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);
  await sql`
    UPDATE conversions SET
      matched = false, via_click_id = NULL, matched_click_data = NULL
    WHERE conversion_id = ${id}
  `;

  return NextResponse.json({ ok: true });
}

// DELETE — permanently delete a conversion record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);
  await sql`DELETE FROM conversions WHERE conversion_id = ${id}`;

  return NextResponse.json({ ok: true });
}
