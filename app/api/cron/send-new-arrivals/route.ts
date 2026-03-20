import { NextResponse } from "next/server";
import { getNewArrivals } from "@/app/lib/db";
import { getApprovedPilotEmails } from "@/app/lib/pilot-db";
import { sendNewArrivalsEmail } from "@/app/lib/email";

// Allow up to 5 minutes for bulk sending
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [products, emails] = await Promise.all([
      getNewArrivals(12, 7, true),
      getApprovedPilotEmails(),
    ]);

    if (products.length === 0) {
      return NextResponse.json({ ok: true, message: "No new arrivals today.", sent: 0 });
    }

    if (emails.length === 0) {
      return NextResponse.json({ ok: true, message: "No approved users to email.", sent: 0 });
    }

    const { sent, failed } = await sendNewArrivalsEmail(emails, products);

    return NextResponse.json({ ok: true, products: products.length, sent, failed });
  } catch (err) {
    console.error("New arrivals cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
