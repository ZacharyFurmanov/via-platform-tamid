import { NextResponse } from "next/server";
import {
  getUnnotifiedInsiderProducts,
  markProductsAsInsiderNotified,
  initDatabase,
} from "@/app/lib/db";
import { getInsiderUserEmails, initMembershipColumns } from "@/app/lib/membership-db";
import { sendInsiderNewArrivalsEmail } from "@/app/lib/email";
import { getSetting, saveSetting } from "@/app/lib/settings-db";

// Allow up to 5 minutes for bulk sending
export const maxDuration = 300;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDatabase();
    await initMembershipColumns();

    // Only send one insider email per day — prevent duplicates from re-runs
    const lastSentRaw = await getSetting("insider_arrivals_last_sent_at");
    if (lastSentRaw) {
      const lastSent = new Date(lastSentRaw);
      const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 23) {
        return NextResponse.json({
          ok: true,
          message: `Insider email already sent ${Math.round(hoursSince)}h ago — skipping.`,
          skipped: true,
        });
      }
    }

    const [products, members] = await Promise.all([
      getUnnotifiedInsiderProducts(50),
      getInsiderUserEmails(),
    ]);

    if (products.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No new products to notify about.",
        products: 0,
        members: members.length,
        sent: 0,
      });
    }

    if (members.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No insider members to email.",
        products: products.length,
        members: 0,
        sent: 0,
      });
    }

    // Mark as notified BEFORE sending — prevents re-sending if the bulk email
    // send times out or partially fails.
    await markProductsAsInsiderNotified(products.map((p) => p.id));
    await saveSetting("insider_arrivals_last_sent_at", new Date().toISOString());

    const { sent, failed } = await sendInsiderNewArrivalsEmail(members, products);

    return NextResponse.json({
      ok: true,
      products: products.length,
      members: members.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("Insider arrivals cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
