import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "resend";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

/** Map a Resend email subject to a human-readable category slug */
function deriveCategory(subject: string | null | undefined): string {
  if (!subject) return "other";
  const s = subject.toLowerCase();
  if (s.includes("sign in")) return "magic_link";
  if (s.includes("waitlist")) return "waitlist";
  if (s.includes("approved") || s.includes("welcome to vya")) return "pilot_approval";
  if (s.includes("insider") && s.includes("arrivals")) return "insider_arrivals";
  if (s.includes("new arrivals") || s.includes("get it before")) return "new_arrivals";
  if (s.includes("sourcing")) return "sourcing";
  if (s.includes("someone else is looking") || s.includes("favorited")) return "favorite_activity";
  if (s.includes("cart") || s.includes("abandoned")) return "abandoned_cart";
  if (s.includes("trending")) return "trending_item";
  if (s.includes("pop-up") || s.includes("popup") || s.includes("thank you for coming")) return "popup_thank_you";
  if (s.includes("giveaway")) return "giveaway";
  if (s.includes("insider")) return "membership";
  if (s.includes("collabs") || s.includes("credentials") || s.includes("missing")) return "internal_alert";
  return "other";
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const bodyText = await request.text();

  // Verify signature
  try {
    const wh = new Webhooks();
    wh.verify({ payload: bodyText, headers: request.headers, webhookSecret });
  } catch (err) {
    console.error("[resend-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType: string = event.type ?? "";
  const data = event.data ?? {};
  const resendEmailId: string = data.email_id ?? data.id ?? "";
  const recipient: string = Array.isArray(data.to) ? data.to[0] : (data.to ?? "");
  const subject: string = data.subject ?? "";
  const category = deriveCategory(subject);

  // Only store events we care about for analytics
  const tracked = ["email.sent", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained"];
  if (!tracked.includes(eventType)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });

  const sql = neon(dbUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS email_events (
      id              SERIAL PRIMARY KEY,
      resend_email_id TEXT NOT NULL,
      event_type      TEXT NOT NULL,
      category        TEXT NOT NULL DEFAULT 'other',
      recipient       TEXT,
      subject         TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_events_category ON email_events(category, event_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_events_ts ON email_events(created_at)`;

  await sql`
    INSERT INTO email_events (resend_email_id, event_type, category, recipient, subject)
    VALUES (${resendEmailId}, ${eventType}, ${category}, ${recipient || null}, ${subject || null})
    ON CONFLICT DO NOTHING
  `;

  return NextResponse.json({ ok: true });
}
