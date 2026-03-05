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
  };
}

export async function createSourcingRequest(data: {
  userId: string;
  userEmail: string;
  userName: string | null;
  imageUrl: string | null;
  description: string;
  priceMin: number;
  priceMax: number;
  condition: string;
  size: string | null;
  deadline: string;
  stripeSessionId: string;
}): Promise<SourcingRequest> {
  const sql = neon(getDatabaseUrl());
  await initSourcingTable();

  const id = generateRequestId();
  const rows = await sql`
    INSERT INTO sourcing_requests (
      id, user_id, user_email, user_name, image_url, description,
      price_min, price_max, condition, size, deadline, stripe_session_id, status
    ) VALUES (
      ${id}, ${data.userId}, ${data.userEmail}, ${data.userName},
      ${data.imageUrl}, ${data.description}, ${data.priceMin}, ${data.priceMax},
      ${data.condition}, ${data.size}, ${data.deadline}, ${data.stripeSessionId},
      'pending_payment'
    )
    RETURNING *
  `;
  return mapRow(rows[0]);
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
