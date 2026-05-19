import { NextRequest, NextResponse } from "next/server";
import { saveConversion } from "@/app/lib/analytics-db";
import { syncProducts } from "@/app/lib/db";
import { neon } from "@neondatabase/serverless";

const STORE_SLUG = "carroll-street-vintage";
const STORE_NAME = "Carroll Street Vintage";

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  billing_details: { email: string | null; name: string | null };
  receipt_email: string | null;
  description: string | null;
}

async function fetchStripeCharges(apiKey: string, createdAfter: number): Promise<StripeCharge[]> {
  const all: StripeCharge[] = [];
  let startingAfter: string | null = null;

  while (true) {
    const params = new URLSearchParams({
      limit: "100",
      "created[gte]": String(createdAfter),
    });
    if (startingAfter) params.set("starting_after", startingAfter);

    const resp = await fetch(`https://api.stripe.com/v1/charges?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Stripe API error ${resp.status}: ${err}`);
    }

    const data = (await resp.json()) as { data: StripeCharge[]; has_more: boolean };
    all.push(...data.data);
    if (!data.has_more || data.data.length === 0) break;
    startingAfter = data.data[data.data.length - 1].id;
  }

  return all;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.STRIPE_SECRET_KEY_CARROLL;
  if (!apiKey) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY_CARROLL not set" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const since = (body as { since?: string }).since;
  const cutoffDate = since
    ? new Date(since)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const createdAfter = Math.floor(cutoffDate.getTime() / 1000);

  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

  let charges: StripeCharge[];
  try {
    charges = await fetchStripeCharges(apiKey, createdAfter);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const succeeded = charges.filter((c) => c.status === "succeeded");

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const charge of succeeded) {
    const email = charge.billing_details?.email || charge.receipt_email;
    const conversionId = `stripe-${STORE_SLUG}-${charge.id}`;
    const orderTotal = charge.amount / 100;
    const currency = charge.currency.toUpperCase();
    const timestamp = new Date(charge.created * 1000).toISOString();

    type ClickRow = { click_id: string; product_name: string; timestamp: string; user_id: string | null };

    // Match buyer to a VYA user by email
    let userId: string | null = null;
    if (email) {
      const userRows = await sql`
        SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
      `.catch(() => []);
      if (userRows.length > 0) userId = String((userRows[0] as { id: unknown }).id);
    }

    // Find the most recent VYA click for this store (within 7 days before the charge)
    const clickCutoff = new Date(charge.created * 1000 - 7 * 24 * 60 * 60 * 1000).toISOString();
    let matchedClick: ClickRow | null = null;

    if (userId) {
      const clickRows = await sql`
        SELECT click_id, product_name, timestamp, user_id
        FROM clicks
        WHERE store_slug = ${STORE_SLUG}
          AND user_id = ${userId}
          AND timestamp >= ${clickCutoff}
          AND timestamp <= ${timestamp}
        ORDER BY timestamp DESC
        LIMIT 1
      `.catch(() => []);
      if (clickRows.length > 0) matchedClick = clickRows[0] as ClickRow;
    }

    // Fallback: any recent click for this store (last 7 days) if no user match
    if (!matchedClick && !userId) {
      const clickRows = await sql`
        SELECT click_id, product_name, timestamp, user_id
        FROM clicks
        WHERE store_slug = ${STORE_SLUG}
          AND timestamp >= ${clickCutoff}
          AND timestamp <= ${timestamp}
        ORDER BY timestamp DESC
        LIMIT 1
      `.catch(() => []);
      if (clickRows.length > 0) matchedClick = clickRows[0] as ClickRow;
    }

    const isMatched = !!matchedClick || !!userId;

    try {
      const { duplicate } = await saveConversion({
        conversionId,
        timestamp,
        orderId: charge.id,
        orderTotal,
        currency,
        items: charge.description ? [{ productName: charge.description, quantity: 1, price: orderTotal }] : [],
        viaClickId: matchedClick ? matchedClick.click_id : null,
        userId: userId ?? undefined,
        storeSlug: STORE_SLUG,
        storeName: STORE_NAME,
        matched: isMatched,
        matchedClickData: matchedClick
          ? { clickId: matchedClick.click_id, clickTimestamp: matchedClick.timestamp, productName: matchedClick.product_name, source: "stripe-click-match" }
          : userId
          ? { source: "stripe-email-match", userId, buyerEmail: email ?? undefined }
          : { source: "stripe-unmatched" },
      });

      if (duplicate) {
        skipped++;
      } else {
        saved++;
        console.log(`[carroll-street-stripe] Saved: ${charge.id} $${orderTotal} matched=${isMatched}`);
      }
    } catch (err) {
      console.error(`[carroll-street-stripe] Error saving ${charge.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    totalCharges: succeeded.length,
    saved,
    skipped,
    errors,
    since: cutoffDate.toISOString(),
  });
}

// ── Product sync via Supabase ─────────────────────────────────────────────────

const CARROLL_SUPABASE_URL = "https://pzolnmlysfhbkvidlpvp.supabase.co";
const FALLBACK_TABLES = ["sold_items", "products", "items", "clothing", "inventory", "product", "listings", "pieces", "catalog", "shop_items", "store_items", "clothes", "vintage_items", "collection", "all_items", "inventory_items"];

type SupabaseRow = Record<string, unknown>;

async function fetchSupabaseTable(anonKey: string, table: string): Promise<{ rows: SupabaseRow[] | null; status: number; body?: unknown }> {
  try {
    const resp = await fetch(`${CARROLL_SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    const body = await resp.json().catch(() => null);
    if (!resp.ok) return { rows: null, status: resp.status, body };
    return { rows: Array.isArray(body) ? body : null, status: resp.status, body };
  } catch (err) {
    return { rows: null, status: 0, body: String(err) };
  }
}

// Discover all tables exposed by Supabase via its OpenAPI spec
async function discoverTables(anonKey: string): Promise<string[]> {
  try {
    const resp = await fetch(`${CARROLL_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: "application/json" },
    });
    if (!resp.ok) return [];
    const spec = await resp.json() as { definitions?: Record<string, unknown> };
    return Object.keys(spec.definitions ?? {});
  } catch {
    return [];
  }
}

function mapRowToProduct(row: SupabaseRow) {
  const title = String(row.name ?? row.title ?? row.product_name ?? "").trim();
  const price = Number(row.price ?? row.amount ?? row.cost ?? 0);
  const rawImages = row.images ?? row.image_urls ?? row.photos;
  const images: string[] = Array.isArray(rawImages)
    ? (rawImages as unknown[]).map(String).filter(Boolean)
    : [];
  const image = String(row.image ?? row.image_url ?? row.photo ?? images[0] ?? "").trim() || null;
  const description = String(row.description ?? row.details ?? "").trim() || undefined;
  const size = String(row.size ?? "").trim() || undefined;
  const sold = !!(row.sold ?? row.is_sold ?? row.sold_out ?? false);

  return { title, price, image, images: images.length ? images : undefined, description, size, sold };
}

export async function GET(request: NextRequest) {
  void request;
  const anonKey = process.env.SUPABASE_ANON_KEY_CARROLL;
  if (!anonKey) {
    return NextResponse.json({ error: "SUPABASE_ANON_KEY_CARROLL not set" }, { status: 500 });
  }

  let rows: SupabaseRow[] | null = null;
  let foundTable = "";

  // Discover tables from the OpenAPI spec, then fall back to our known list
  const discoveredTables = await discoverTables(anonKey);
  const tablesToTry = discoveredTables.length > 0
    ? [...new Set([...discoveredTables, ...FALLBACK_TABLES])]
    : FALLBACK_TABLES;

  const attempts: { table: string; status: number; body?: unknown }[] = [];

  for (const table of tablesToTry) {
    const result = await fetchSupabaseTable(anonKey, table);
    attempts.push({ table, status: result.status, body: result.rows === null ? result.body : `${result.rows.length} rows` });
    if (result.rows !== null) {
      rows = result.rows;
      foundTable = table;
      break;
    }
  }

  if (!rows) {
    return NextResponse.json({
      error: `No product table found.`,
      discoveredTables,
      attempts,
    }, { status: 404 });
  }

  const mapped = rows
    .map(mapRowToProduct)
    .filter((p) => p.title && p.price > 0 && !p.sold)
    .map((p) => ({
      title: p.title,
      price: p.price,
      currency: "USD",
      image: p.image ?? undefined,
      images: p.images,
      externalUrl: "https://carrollstreetvintage.com",
      description: p.description,
    }));

  const { count } = await syncProducts(STORE_SLUG, STORE_NAME, mapped);

  return NextResponse.json({ ok: true, productCount: count, total: rows.length, table: foundTable });
}
