import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getApprovedPilotEmails } from "@/app/lib/pilot-db";
import { sendNewArrivalsEmail } from "@/app/lib/email";
import { getSetting, saveSetting } from "@/app/lib/settings-db";
import type { DBProduct } from "@/app/lib/db";

// Allow up to 5 minutes for bulk sending
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Determine the window: from last send (or 7 days ago) to now
    const lastSentRaw = await getSetting("new_arrivals_last_sent_at");
    const since = lastSentRaw
      ? new Date(lastSentRaw)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "No database URL" }, { status: 500 });
    }

    const sql = neon(dbUrl);
    const sinceIso = since.toISOString();

    const rows = await sql`
      SELECT * FROM products
      WHERE created_at IS NOT NULL
        AND created_at >= ${sinceIso}
        AND created_at <= NOW() - interval '24 hours'
        AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
        AND title NOT ILIKE '%gift card%'
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const products = rows as DBProduct[];

    if (products.length === 0) {
      // Still update the timestamp so next week's window starts from now
      await saveSetting("new_arrivals_last_sent_at", new Date().toISOString());
      return NextResponse.json({ ok: true, message: "No new arrivals this week.", sent: 0 });
    }

    const emails = await getApprovedPilotEmails();

    if (emails.length === 0) {
      return NextResponse.json({ ok: true, message: "No approved users to email.", sent: 0 });
    }

    const { sent, failed } = await sendNewArrivalsEmail(emails, products);

    // Save the send time so next Tuesday covers from now → next Tuesday
    await saveSetting("new_arrivals_last_sent_at", new Date().toISOString());

    return NextResponse.json({ ok: true, since: sinceIso, products: products.length, sent, failed });
  } catch (err) {
    console.error("New arrivals cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
