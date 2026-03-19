import { neon } from "@neondatabase/serverless";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("No database URL configured");
  return url;
}

export type SourcingOffer = {
  id: string;
  requestId: string;
  requestDescription?: string;
  storeSlug: string;
  storeName: string;
  storeEmail: string;
  fee: number;
  timeline: string;
  notes: string | null;
  expectedPriceMin: number | null;
  expectedPriceMax: number | null;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

async function initOffersTable(): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS sourcing_offers (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      store_slug TEXT NOT NULL,
      store_name TEXT NOT NULL,
      store_email TEXT NOT NULL,
      fee INTEGER NOT NULL,
      timeline TEXT NOT NULL,
      notes TEXT,
      expected_price_min INTEGER,
      expected_price_max INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE sourcing_offers ADD COLUMN IF NOT EXISTS expected_price_min INTEGER`;
  await sql`ALTER TABLE sourcing_offers ADD COLUMN IF NOT EXISTS expected_price_max INTEGER`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sourcing_offers_request_id ON sourcing_offers(request_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sourcing_offers_store_slug ON sourcing_offers(store_slug)`;
}

function generateOfferId(): string {
  return `so_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapOffer(row: Record<string, unknown>): SourcingOffer {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    requestDescription: row.request_description as string | undefined,
    storeSlug: row.store_slug as string,
    storeName: row.store_name as string,
    storeEmail: row.store_email as string,
    fee: Number(row.fee),
    timeline: row.timeline as string,
    notes: row.notes as string | null,
    expectedPriceMin: row.expected_price_min != null ? Number(row.expected_price_min) : null,
    expectedPriceMax: row.expected_price_max != null ? Number(row.expected_price_max) : null,
    status: row.status as SourcingOffer["status"],
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export async function createSourcingOffer(data: {
  requestId: string;
  storeSlug: string;
  storeName: string;
  storeEmail: string;
  fee: number;
  timeline: string;
  notes: string | null;
  expectedPriceMin: number | null;
  expectedPriceMax: number | null;
}): Promise<SourcingOffer> {
  const sql = neon(getDatabaseUrl());
  await initOffersTable();
  const id = generateOfferId();
  const rows = await sql`
    INSERT INTO sourcing_offers
      (id, request_id, store_slug, store_name, store_email, fee, timeline, notes, expected_price_min, expected_price_max)
    VALUES
      (${id}, ${data.requestId}, ${data.storeSlug}, ${data.storeName},
       ${data.storeEmail}, ${data.fee}, ${data.timeline}, ${data.notes},
       ${data.expectedPriceMin}, ${data.expectedPriceMax})
    RETURNING *
  `;
  return mapOffer(rows[0]);
}

export async function getOffersByRequestId(requestId: string): Promise<SourcingOffer[]> {
  const sql = neon(getDatabaseUrl());
  await initOffersTable();
  const rows = await sql`
    SELECT * FROM sourcing_offers WHERE request_id = ${requestId} ORDER BY created_at ASC
  `;
  return rows.map(mapOffer);
}

export async function getOffersByStoreSlug(storeSlug: string): Promise<SourcingOffer[]> {
  const sql = neon(getDatabaseUrl());
  await initOffersTable();
  const rows = await sql`
    SELECT so.*, sr.description AS request_description
    FROM sourcing_offers so
    LEFT JOIN sourcing_requests sr ON sr.id = so.request_id
    WHERE so.store_slug = ${storeSlug}
    ORDER BY so.created_at DESC
  `;
  return rows.map(mapOffer);
}

export async function hasStoreSubmittedOffer(requestId: string, storeSlug: string): Promise<boolean> {
  const sql = neon(getDatabaseUrl());
  await initOffersTable();
  const rows = await sql`
    SELECT id FROM sourcing_offers
    WHERE request_id = ${requestId} AND store_slug = ${storeSlug}
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Accept one offer and decline all other pending offers for the same request.
 * Returns the accepted offer, or null if the offer was already actioned.
 */
export async function acceptSourcingOffer(
  offerId: string,
  requestId: string
): Promise<SourcingOffer | null> {
  const sql = neon(getDatabaseUrl());
  await initOffersTable();

  const accepted = await sql`
    UPDATE sourcing_offers
    SET status = 'accepted'
    WHERE id = ${offerId} AND request_id = ${requestId} AND status = 'pending'
    RETURNING *
  `;
  if (accepted.length === 0) return null;

  // Decline all other pending offers for this request
  await sql`
    UPDATE sourcing_offers
    SET status = 'declined'
    WHERE request_id = ${requestId} AND id != ${offerId} AND status = 'pending'
  `;

  return mapOffer(accepted[0]);
}
