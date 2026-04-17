import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Valid promo codes and their source labels
const PROMO_CODES: Record<string, string> = {
  NYC: "nyc-popup-2026-03-29",
  CLAIRE: "claire-referral",
};

// Simple in-memory rate limiter: max 5 failed attempts per IP per 15 minutes
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry || now > entry.resetAt) return true;
  return entry.count < MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const code: string = String(body.code ?? "").trim().toUpperCase();
    const email: string = String(body.email ?? "").trim().toLowerCase();

    if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });
    if (!email || !isValidEmail(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

    const source = PROMO_CODES[code];
    if (!source) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
    }

    const sql = neon(getDatabaseUrl());

    // Ensure promo_code column exists
    await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS promo_code TEXT`;

    // Upsert: insert as approved or upgrade pending → approved
    await sql`
      INSERT INTO pilot_access (email, status, approved_at, promo_code)
      VALUES (${email}, 'approved', NOW(), ${code})
      ON CONFLICT (email) DO UPDATE
        SET status      = 'approved',
            approved_at = COALESCE(pilot_access.approved_at, NOW()),
            promo_code  = COALESCE(pilot_access.promo_code, ${code})
    `;

    // Also add to waitlist table for full tracking
    await sql`
      INSERT INTO waitlist (email, signup_date, source)
      VALUES (${email}, NOW(), ${source})
      ON CONFLICT (email) DO NOTHING
    `.catch(() => {});

    // Set access cookie so they can browse immediately
    const response = NextResponse.json({ ok: true, approved: true });
    response.cookies.set("via_access", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  } catch (err) {
    console.error("[promo-code]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// Admin: get promo code usage stats
export async function GET(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const auth = request.headers.get("authorization");
  if (!adminPassword || auth !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(getDatabaseUrl());
  await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS promo_code TEXT`.catch(() => {});

  const rows = await sql`
    SELECT promo_code, COUNT(*)::int AS count
    FROM pilot_access
    WHERE promo_code IS NOT NULL
    GROUP BY promo_code
    ORDER BY count DESC
  `;

  return NextResponse.json({ promoCodes: rows });
}
