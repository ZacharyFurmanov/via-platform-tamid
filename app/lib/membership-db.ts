import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  }
  return url;
};

let columnsInitialized = false;

export async function initMembershipColumns() {
  if (columnsInitialized) return;
  const sql = neon(getDatabaseUrl());

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS member_since TIMESTAMP WITH TIME ZONE`;

  columnsInitialized = true;
}

export async function getUserMembershipStatus(
  userId: string
): Promise<{ isMember: boolean; memberSince: Date | null }> {
  await initMembershipColumns();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT is_member, member_since FROM users WHERE id = ${userId}
  `;
  if (!rows[0]) return { isMember: false, memberSince: null };

  return {
    isMember: rows[0].is_member === true,
    memberSince: rows[0].member_since ? new Date(rows[0].member_since as string) : null,
  };
}

export async function setMemberActive(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
): Promise<void> {
  await initMembershipColumns();
  const sql = neon(getDatabaseUrl());

  await sql`
    UPDATE users SET
      is_member = TRUE,
      stripe_customer_id = ${stripeCustomerId},
      stripe_subscription_id = ${stripeSubscriptionId},
      member_since = COALESCE(member_since, NOW()),
      updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function setMemberCancelled(userId: string): Promise<void> {
  await initMembershipColumns();
  const sql = neon(getDatabaseUrl());

  await sql`
    UPDATE users SET
      is_member = FALSE,
      stripe_subscription_id = NULL,
      updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<{ id: string; email: string } | null> {
  await initMembershipColumns();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT id, email FROM users WHERE stripe_customer_id = ${stripeCustomerId}
  `;
  if (!rows[0]) return null;

  return { id: rows[0].id as string, email: rows[0].email as string };
}

export async function getUserByEmail(
  email: string
): Promise<{ id: string; email: string; stripe_customer_id: string | null } | null> {
  await initMembershipColumns();
  const sql = neon(getDatabaseUrl());

  const rows = await sql`
    SELECT id, email, stripe_customer_id FROM users WHERE email = ${email}
  `;
  if (!rows[0]) return null;

  return {
    id: rows[0].id as string,
    email: rows[0].email as string,
    stripe_customer_id: (rows[0].stripe_customer_id as string) ?? null,
  };
}

/**
 * Get emails of all active VYA Insider members.
 */
export async function getInsiderUserEmails(): Promise<string[]> {
  await initMembershipColumns();
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT email FROM users WHERE is_member = TRUE AND email IS NOT NULL
  `;
  return rows.map((r) => r.email as string);
}

export async function saveStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await initMembershipColumns();
  const sql = neon(getDatabaseUrl());

  await sql`
    UPDATE users SET stripe_customer_id = ${stripeCustomerId}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}
