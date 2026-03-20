import { neon } from "@neondatabase/serverless";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("No database URL configured");
  return url;
}

export type SourcingRequest = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  userPhone: string | null;
  userInstagram: string | null;
  imageUrl: string | null;
  description: string;
  priceMin: number;
  priceMax: number;
  condition: string;
  size: string | null;
  deadline: string;
  stripeSessionId: string | null;
  status: "pending_payment" | "paid" | "matched" | "refunded";
  createdAt: string;
  matchedStoreSlug: string | null;
  matchedStoreAt: string | null;
  preferredStoreSlugs: string[] | null;
};

async function initSourcingTable(): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS sourcing_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_name TEXT,
      image_url TEXT,
      description TEXT NOT NULL,
      price_min INTEGER NOT NULL,
      price_max INTEGER NOT NULL,
      condition TEXT NOT NULL,
      size TEXT,
      deadline TEXT NOT NULL,
      stripe_session_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sourcing_user_id ON sourcing_requests(user_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sourcing_stripe_session ON sourcing_requests(stripe_session_id)
      WHERE stripe_session_id IS NOT NULL
  `;
  // Idempotent migrations for store claiming
  await sql`ALTER TABLE sourcing_requests ADD COLUMN IF NOT EXISTS matched_store_slug TEXT`;
  await sql`ALTER TABLE sourcing_requests ADD COLUMN IF NOT EXISTS matched_store_at TIMESTAMPTZ`;
  // Idempotent migration for preferred store slugs (JSON array stored as text)
  await sql`ALTER TABLE sourcing_requests ADD COLUMN IF NOT EXISTS preferred_store_slugs TEXT`;
  // Idempotent migrations for contact info
  await sql`ALTER TABLE sourcing_requests ADD COLUMN IF NOT EXISTS user_phone TEXT`;
  await sql`ALTER TABLE sourcing_requests ADD COLUMN IF NOT EXISTS user_instagram TEXT`;
}

function generateRequestId(): string {
  return `sr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapRow(row: Record<string, unknown>): SourcingRequest {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userEmail: row.user_email as string,
    userName: row.user_name as string | null,
    userPhone: row.user_phone as string | null,
    userInstagram: row.user_instagram as string | null,
    imageUrl: row.image_url as string | null,
    description: row.description as string,
    priceMin: row.price_min as number,
    priceMax: row.price_max as number,
    condition: row.condition as string,
    size: row.size as string | null,
    deadline: row.deadline as string,
    stripeSessionId: row.stripe_session_id as string | null,
    status: row.status as SourcingRequest["status"],
    createdAt: (row.created_at as Date).toISOString(),
    matchedStoreSlug: row.matched_store_slug as string | null,
    matchedStoreAt: row.matched_store_at
      ? (row.matched_store_at as Date).toISOString()
      : null,
    preferredStoreSlugs: row.preferred_store_slugs
      ? JSON.parse(row.preferred_store_slugs as string) as string[]
      : null,
  };
}

export async function createSourcingRequest(data: {
  userId: string;
  userEmail: string;
  userName: string | null;
  userPhone: string | null;
  userInstagram: string | null;
  imageUrl: string | null;
  description: string;
  priceMin: number;
  priceMax: number;
  condition: string;
  size: string | null;
  deadline: string;
  stripeSessionId: string;
  preferredStoreSlugs: string[] | null;
}): Promise<SourcingRequest> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  const id = generateRequestId();
  const preferredJson = data.preferredStoreSlugs && data.preferredStoreSlugs.length > 0
    ? JSON.stringify(data.preferredStoreSlugs)
    : null;
  const rows = await sql`
    INSERT INTO sourcing_requests (
      id, user_id, user_email, user_name, user_phone, user_instagram, image_url, description,
      price_min, price_max, condition, size, deadline, stripe_session_id, status,
      preferred_store_slugs
    ) VALUES (
      ${id}, ${data.userId}, ${data.userEmail}, ${data.userName},
      ${data.userPhone}, ${data.userInstagram},
      ${data.imageUrl}, ${data.description}, ${data.priceMin}, ${data.priceMax},
      ${data.condition}, ${data.size}, ${data.deadline}, ${data.stripeSessionId},
      'pending_payment', ${preferredJson}
    )
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function updateSourcingRequest(
  id: string,
  userId: string,
  data: {
    description: string;
    priceMin: number;
    priceMax: number;
    condition: string;
    size: string | null;
    deadline: string;
    userPhone: string | null;
    userInstagram: string | null;
  }
): Promise<SourcingRequest | null> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  const rows = await sql`
    UPDATE sourcing_requests SET
      description    = ${data.description},
      price_min      = ${data.priceMin},
      price_max      = ${data.priceMax},
      condition      = ${data.condition},
      size           = ${data.size},
      deadline       = ${data.deadline},
      user_phone     = ${data.userPhone},
      user_instagram = ${data.userInstagram}
    WHERE id = ${id} AND user_id = ${userId} AND status IN ('paid', 'pending_payment')
    RETURNING *
  `;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function updateSourcingStripeSession(
  id: string,
  userId: string,
  stripeSessionId: string
): Promise<boolean> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    UPDATE sourcing_requests
    SET stripe_session_id = ${stripeSessionId}
    WHERE id = ${id} AND user_id = ${userId} AND status = 'pending_payment'
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getAllSourcingRequests(): Promise<SourcingRequest[]> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();
  const rows = await sql`
    SELECT * FROM sourcing_requests
    ORDER BY created_at DESC
  `;
  return rows.map(mapRow);
}

export async function markSourcingRequestPaid(stripeSessionId: string): Promise<SourcingRequest | null> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  const rows = await sql`
    UPDATE sourcing_requests
    SET status = 'paid'
    WHERE stripe_session_id = ${stripeSessionId} AND status = 'pending_payment'
    RETURNING *
  `;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getSourcingRequestBySession(stripeSessionId: string): Promise<SourcingRequest | null> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  const rows = await sql`
    SELECT * FROM sourcing_requests WHERE stripe_session_id = ${stripeSessionId} LIMIT 1
  `;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getSourcingRequestById(id: string, userId: string): Promise<SourcingRequest | null> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();
  const rows = await sql`
    SELECT * FROM sourcing_requests WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getUserSourcingRequests(userId: string): Promise<SourcingRequest[]> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  const rows = await sql`
    SELECT * FROM sourcing_requests
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(mapRow);
}

export async function getOpenSourcingRequests(storeSlug?: string): Promise<SourcingRequest[]> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  // "via-admin" and unfiltered calls see all open requests
  const rows = !storeSlug || storeSlug === "via-admin"
    ? await sql`
        SELECT * FROM sourcing_requests
        WHERE status = 'paid' AND matched_store_slug IS NULL
        ORDER BY created_at ASC
      `
    : await sql`
        SELECT * FROM sourcing_requests
        WHERE status = 'paid' AND matched_store_slug IS NULL
          AND (
            preferred_store_slugs IS NULL
            OR preferred_store_slugs::jsonb @> to_jsonb(${storeSlug}::text)
          )
        ORDER BY created_at ASC
      `;
  return rows.map(mapRow);
}

export async function getSourcingRequestsByStore(storeSlug: string): Promise<SourcingRequest[]> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  const rows = await sql`
    SELECT * FROM sourcing_requests
    WHERE matched_store_slug = ${storeSlug}
    ORDER BY matched_store_at DESC
  `;
  return rows.map(mapRow);
}

export async function claimSourcingRequest(
  id: string,
  storeSlug: string
): Promise<{ success: boolean; error?: string }> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  const rows = await sql`
    UPDATE sourcing_requests
    SET status = 'matched', matched_store_slug = ${storeSlug}, matched_store_at = NOW()
    WHERE id = ${id} AND status = 'paid' AND matched_store_slug IS NULL
    RETURNING id
  `;

  if (rows.length === 0) {
    return { success: false, error: "Already claimed" };
  }
  return { success: true };
}
