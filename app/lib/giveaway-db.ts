import { neon } from "@neondatabase/serverless";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  }
  return url;
};

export interface GiveawayEntry {
  id: number;
  email: string;
  referralCode: string;
  referredByCode: string | null;
  referralCount: number;
  friend1Email: string | null;
  friend2Email: string | null;
  phone1: string | null;
  phone2: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Characters excluding ambiguous ones (O/0/I/1)
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

export async function initGiveawayDatabase() {
  const sql = neon(getDatabaseUrl());

  await sql`
    CREATE TABLE IF NOT EXISTS giveaway_entries (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      referral_code VARCHAR(12) NOT NULL UNIQUE,
      referred_by_code VARCHAR(12),
      referral_count INT DEFAULT 0,
      friend_1_email VARCHAR(255),
      friend_2_email VARCHAR(255),
      phone_1 VARCHAR(20),
      phone_2 VARCHAR(20),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_giveaway_referral_code ON giveaway_entries(referral_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_giveaway_email ON giveaway_entries(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_giveaway_referred_by ON giveaway_entries(referred_by_code)`;
}

export async function createGiveawayEntry(
  email: string,
  referredByCode?: string
): Promise<{ referralCode: string; isExisting: boolean }> {
  const sql = neon(getDatabaseUrl());
  await initGiveawayDatabase();

  // Check if email already exists
  const existing = await sql`
    SELECT referral_code FROM giveaway_entries WHERE email = ${email.toLowerCase()}
  `;

  if (existing.length > 0) {
    return { referralCode: existing[0].referral_code as string, isExisting: true };
  }

  // Generate unique referral code with retry on collision
  let referralCode = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    try {
      await sql`
        INSERT INTO giveaway_entries (email, referral_code, referred_by_code)
        VALUES (${email.toLowerCase()}, ${referralCode}, ${referredByCode || null})
      `;
      return { referralCode, isExisting: false };
    } catch (err: unknown) {
      const error = err as { code?: string };
      // Unique violation on referral_code — retry with new code
      if (error.code === "23505") {
        referralCode = generateReferralCode();
        attempts++;
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to generate unique referral code after 10 attempts");
}

export async function getEntryByCode(code: string): Promise<GiveawayEntry | null> {
  const sql = neon(getDatabaseUrl());
  await initGiveawayDatabase();

  const result = await sql`
    SELECT * FROM giveaway_entries WHERE referral_code = ${code}
  `;

  if (result.length === 0) return null;
  return mapRow(result[0]);
}

export async function getEntryByEmail(email: string): Promise<GiveawayEntry | null> {
  const sql = neon(getDatabaseUrl());
  await initGiveawayDatabase();

  const result = await sql`
    SELECT * FROM giveaway_entries WHERE email = ${email.toLowerCase()}
  `;

  if (result.length === 0) return null;
  return mapRow(result[0]);
}

export async function recordPhoneInvites(
  code: string,
  phone1: string,
  phone2: string
): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await initGiveawayDatabase();

  await sql`
    UPDATE giveaway_entries
    SET phone_1 = ${phone1}, phone_2 = ${phone2}, updated_at = NOW()
    WHERE referral_code = ${code}
  `;
}

export async function processReferralEntry(
  newEmail: string,
  referrerCode: string
): Promise<{ referrerEntry: GiveawayEntry; friendNumber: 1 | 2 | null } | null> {
  const sql = neon(getDatabaseUrl());
  await initGiveawayDatabase();

  // Atomically increment referral_count (no cap — more referrals = more chances to win)
  // Still store first two friend emails in the dedicated slots
  const result = await sql`
    UPDATE giveaway_entries
    SET
      referral_count = referral_count + 1,
      friend_1_email = CASE WHEN referral_count = 0 THEN ${newEmail.toLowerCase()} ELSE friend_1_email END,
      friend_2_email = CASE WHEN referral_count = 1 THEN ${newEmail.toLowerCase()} ELSE friend_2_email END,
      updated_at = NOW()
    WHERE referral_code = ${referrerCode}
    RETURNING *
  `;

  if (result.length === 0) return null;

  const entry = mapRow(result[0]);
  const friendNumber = entry.referralCount === 1 ? 1 : entry.referralCount === 2 ? 2 : null;
  return { referrerEntry: entry, friendNumber };
}

function mapRow(row: Record<string, unknown>): GiveawayEntry {
  return {
    id: row.id as number,
    email: row.email as string,
    referralCode: row.referral_code as string,
    referredByCode: row.referred_by_code as string | null,
    referralCount: row.referral_count as number,
    friend1Email: row.friend_1_email as string | null,
    friend2Email: row.friend_2_email as string | null,
    phone1: row.phone_1 as string | null,
    phone2: row.phone_2 as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
