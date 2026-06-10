import { neon } from "@neondatabase/serverless";

// Per-store subscription plan for the B2B data layer. "pro" unlocks the Demand
// Intelligence dashboard; "free" sees a locked teaser. Stripe fields back the
// store-side subscription (separate from the consumer membership in users).

export type StorePlan = {
 storeSlug: string;
 plan: "free" | "pro";
 status: string | null; // stripe subscription status (active, trialing, past_due, canceled…)
 stripeCustomerId: string | null;
 stripeSubscriptionId: string | null;
 currentPeriodEnd: string | null;
 updatedAt: string;
};

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 const sql = db();
 await sql`
 CREATE TABLE IF NOT EXISTS store_plans (
  store_slug TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )
 `;
 ensured = true;
}

function mapRow(r: Record<string, unknown>): StorePlan {
 return {
 storeSlug: r.store_slug as string,
 plan: (r.plan as "free" | "pro") ?? "free",
 status: (r.status as string | null) ?? null,
 stripeCustomerId: (r.stripe_customer_id as string | null) ?? null,
 stripeSubscriptionId: (r.stripe_subscription_id as string | null) ?? null,
 currentPeriodEnd:
  r.current_period_end instanceof Date
   ? (r.current_period_end as Date).toISOString()
   : (r.current_period_end as string | null) ?? null,
 updatedAt:
  r.updated_at instanceof Date ? (r.updated_at as Date).toISOString() : String(r.updated_at),
 };
}

export async function getStorePlan(storeSlug: string): Promise<StorePlan> {
 await ensureTable();
 const sql = db();
 const rows = (await sql`SELECT * FROM store_plans WHERE store_slug = ${storeSlug} LIMIT 1`) as Array<Record<string, unknown>>;
 if (rows.length === 0) {
 return {
  storeSlug,
  plan: "free",
  status: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodEnd: null,
  updatedAt: new Date(0).toISOString(),
 };
 }
 return mapRow(rows[0]);
}

/** True if the store currently has an active Pro subscription. */
export async function isStorePro(storeSlug: string): Promise<boolean> {
 // The VYA admin test account always has full access.
 if (storeSlug === "via-admin") return true;
 const p = await getStorePlan(storeSlug);
 if (p.plan !== "pro") return false;
 if (p.status && ["canceled", "unpaid", "incomplete_expired"].includes(p.status)) return false;
 return true;
}

/** Upsert the plan record (called from the Stripe webhook on subscription changes). */
export async function setStorePlan(
 storeSlug: string,
 fields: Partial<Omit<StorePlan, "storeSlug" | "updatedAt">>,
): Promise<void> {
 await ensureTable();
 const sql = db();
 const cur = await getStorePlan(storeSlug);
 const plan = fields.plan ?? cur.plan;
 const status = fields.status ?? cur.status;
 const stripeCustomerId = fields.stripeCustomerId ?? cur.stripeCustomerId;
 const stripeSubscriptionId = fields.stripeSubscriptionId ?? cur.stripeSubscriptionId;
 const currentPeriodEnd = fields.currentPeriodEnd ?? cur.currentPeriodEnd;
 await sql`
 INSERT INTO store_plans (store_slug, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
 VALUES (${storeSlug}, ${plan}, ${status}, ${stripeCustomerId}, ${stripeSubscriptionId}, ${currentPeriodEnd}, NOW())
 ON CONFLICT (store_slug) DO UPDATE SET
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW()
 `;
}
