import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  }
  return url;
}

// GET - Return all giveaway entrants as the email list
export async function GET() {
  try {
    const sql = neon(getDatabaseUrl());

    const rows = await sql`
      SELECT email, created_at, referral_count, reminder_sent_at
      FROM giveaway_entries
      ORDER BY created_at ASC
    `;

    const emails = rows.map((row) => ({
      email: row.email as string,
      signupDate: row.created_at as string,
      source: "giveaway",
      referralCount: row.referral_count as number,
      reminded: !!row.reminder_sent_at,
    }));

    return NextResponse.json({
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error("[Newsletter] Error fetching emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

// POST - Add email (creates a giveaway entry)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const sql = neon(getDatabaseUrl());

    const existing = await sql`
      SELECT email FROM giveaway_entries WHERE email = ${normalizedEmail}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "You're already on the list!" },
        { status: 200 }
      );
    }

    // For newsletter signups that don't go through the giveaway flow,
    // just add to waitlist instead
    const existingWaitlist = await sql`
      SELECT email FROM waitlist WHERE email = ${normalizedEmail}
    `;

    if (existingWaitlist.length > 0) {
      return NextResponse.json(
        { message: "You're already on the list!" },
        { status: 200 }
      );
    }

    await sql`
      INSERT INTO waitlist (email, signup_date, source)
      VALUES (${normalizedEmail}, NOW(), 'newsletter')
    `;

    return NextResponse.json(
      { message: "Welcome to VIA! We'll keep you updated." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Newsletter] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
