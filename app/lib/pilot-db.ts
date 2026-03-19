import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS pilot_access (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(50),
      email_subscribe BOOLEAN DEFAULT false,
      sms_subscribe BOOLEAN DEFAULT false,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMP WITH TIME ZONE
    )
  `;
  // Add referral columns if they don't exist yet
  await sql`
    ALTER TABLE pilot_access
    ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
    ADD COLUMN IF NOT EXISTS referred_by VARCHAR(20)
  `;
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function createUniqueReferralCode(): Promise<string> {
  const sql = getDb();
  // Try up to 10 times to get a unique code
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    const existing = await sql`
      SELECT 1 FROM pilot_access WHERE referral_code = ${code} LIMIT 1
    `;
    if (existing.length === 0) return code;
  }
  // Extremely unlikely fallback: append timestamp fragment
  return generateReferralCode() + Date.now().toString(36).slice(-2).toUpperCase();
}

export type PilotStatus = "approved" | "pending" | null;

export async function getPilotStatus(email: string): Promise<PilotStatus> {
  await ensureTable();
  const sql = getDb();
  const rows = await sql`
    SELECT status FROM pilot_access WHERE email = ${email.toLowerCase().trim()}
  `;
  if (rows.length === 0) return null;
  return rows[0].status as "approved" | "pending";
}

export async function getPilotReferralCode(email: string): Promise<string | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT referral_code FROM pilot_access WHERE email = ${email.toLowerCase().trim()}
  `;
  return rows.length > 0 ? (rows[0].referral_code as string | null) : null;
}

export async function createPilotEntry(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  emailSubscribe?: boolean;
  smsSubscribe?: boolean;
  status: "pending" | "approved";
  referredBy?: string;
}) {
  await ensureTable();
  const sql = getDb();
  const referralCode = await createUniqueReferralCode();
  await sql`
    INSERT INTO pilot_access (
      email, first_name, last_name, phone,
      email_subscribe, sms_subscribe, status, approved_at,
      referral_code, referred_by
    )
    VALUES (
      ${data.email.toLowerCase().trim()},
      ${data.firstName ?? null},
      ${data.lastName ?? null},
      ${data.phone ?? null},
      ${data.emailSubscribe ?? false},
      ${data.smsSubscribe ?? false},
      ${data.status},
      ${data.status === "approved" ? new Date().toISOString() : null},
      ${referralCode},
      ${data.referredBy ?? null}
    )
    ON CONFLICT (email) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, pilot_access.first_name),
      last_name = COALESCE(EXCLUDED.last_name, pilot_access.last_name),
      phone = COALESCE(EXCLUDED.phone, pilot_access.phone),
      email_subscribe = EXCLUDED.email_subscribe,
      sms_subscribe = EXCLUDED.sms_subscribe,
      referred_by = COALESCE(pilot_access.referred_by, EXCLUDED.referred_by),
      referral_code = COALESCE(pilot_access.referral_code, EXCLUDED.referral_code)
  `;
  return referralCode;
}

export async function approvePilotUser(email: string) {
  await ensureTable();
  const sql = getDb();
  const normalizedEmail = email.toLowerCase().trim();

  // Try to update an existing pending row first
  const result = await sql`
    UPDATE pilot_access
    SET status = 'approved', approved_at = NOW()
    WHERE email = ${normalizedEmail} AND status = 'pending'
    RETURNING email
  `;

  // If no row existed (waitlist-only user), insert them as approved
  if (result.length === 0) {
    const referralCode = await createUniqueReferralCode();
    await sql`
      INSERT INTO pilot_access (email, status, approved_at, referral_code)
      VALUES (${normalizedEmail}, 'approved', NOW(), ${referralCode})
      ON CONFLICT (email) DO UPDATE
        SET status = 'approved', approved_at = NOW()
    `;
  }
}

export async function getPendingUsersToApprove(): Promise<
  { email: string; first_name: string | null }[]
> {
  await ensureTable();
  const sql = getDb();
  // Wait time tiers based on referral count:
  //   0 referrals → 7 days
  //   1 referral  → 5 days
  //   2 referrals → 4 days
  //   3+ referrals → 3 days
  const rows = await sql`
    SELECT pa.email, pa.first_name
    FROM pilot_access pa
    LEFT JOIN (
      SELECT referred_by, COUNT(*) AS ref_count
      FROM pilot_access
      WHERE referred_by IS NOT NULL
      GROUP BY referred_by
    ) refs ON refs.referred_by = pa.referral_code
    WHERE pa.status = 'pending'
    AND (
      (COALESCE(refs.ref_count, 0) >= 3 AND pa.created_at < NOW() - INTERVAL '3 days')
      OR (COALESCE(refs.ref_count, 0) = 2   AND pa.created_at < NOW() - INTERVAL '4 days')
      OR (COALESCE(refs.ref_count, 0) = 1   AND pa.created_at < NOW() - INTERVAL '5 days')
      OR (COALESCE(refs.ref_count, 0) = 0   AND pa.created_at < NOW() - INTERVAL '7 days')
    )
  `;
  return rows as { email: string; first_name: string | null }[];
}

export async function isEmailInWaitlist(email: string): Promise<boolean> {
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT 1 FROM waitlist WHERE email = ${email.toLowerCase().trim()} LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function approveAllWaitlistUsers(): Promise<number> {
  await ensureTable();
  const sql = getDb();
  const waitlistEmails = await sql`SELECT email FROM waitlist`;
  if (waitlistEmails.length === 0) return 0;
  let count = 0;
  for (const { email } of waitlistEmails) {
    await sql`
      INSERT INTO pilot_access (email, status, approved_at)
      VALUES (${email}, 'approved', NOW())
      ON CONFLICT (email) DO UPDATE SET status = 'approved', approved_at = NOW()
    `;
    count++;
  }
  return count;
}

/**
 * Returns the referral code and number of successful referrals for a user.
 */
export async function getReferralInfo(email: string): Promise<{
  referralCode: string | null;
  referralCount: number;
}> {
  await ensureTable();
  const sql = getDb();
  const rows = await sql`
    SELECT referral_code FROM pilot_access WHERE email = ${email.toLowerCase().trim()}
  `;
  if (rows.length === 0) return { referralCode: null, referralCount: 0 };
  let referralCode = rows[0].referral_code as string | null;
  if (!referralCode) {
    // User exists but never got a referral code — assign one now
    referralCode = await createUniqueReferralCode();
    await sql`UPDATE pilot_access SET referral_code = ${referralCode} WHERE email = ${email.toLowerCase().trim()}`;
  }

  const countRows = await sql`
    SELECT COUNT(*) AS cnt FROM pilot_access WHERE referred_by = ${referralCode}
  `;
  return {
    referralCode,
    referralCount: Number(countRows[0].cnt),
  };
}

/**
 * After a new referral signup, returns the referrer's info so a notification
 * email can be sent. No longer instantly approves — the cron picks them up
 * sooner based on their referral tier (1=5d, 2=4d, 3+=3d).
 */
export async function checkAndApproveReferrer(referralCode: string): Promise<{
  email: string;
  firstName: string | null;
} | null> {
  await ensureTable();
  const sql = getDb();
  const rows = await sql`
    SELECT email, first_name, status FROM pilot_access
    WHERE referral_code = ${referralCode}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const referrer = rows[0] as { email: string; first_name: string | null; status: string };
  if (referrer.status !== "pending") return null;
  return { email: referrer.email, firstName: referrer.first_name };
}
