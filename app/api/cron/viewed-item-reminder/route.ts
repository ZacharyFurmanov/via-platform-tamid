import { NextResponse } from "next/server";
import { getBaseUrl } from "@/app/lib/base-url";
import { getViewedItemCandidates, recordViewedItemReminderSent } from "@/app/lib/notification-db";
import { sendViewedItemReminderEmail } from "@/app/lib/email";

const BASE_URL = getBaseUrl();

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const byUser = await getViewedItemCandidates();
    let sent = 0;
    let skipped = 0;

    for (const [userId, { email, items }] of byUser) {
      try {
        await sendViewedItemReminderEmail(
          email,
          items.map((item) => ({
            productTitle: item.product_title,
            productImage: item.product_image,
            storeName: item.store_name,
            productUrl: `${BASE_URL}/products/${item.store_slug}-${item.product_id}?utm_source=email&utm_medium=email&utm_campaign=viewed_item_reminder`,
            price: item.price,
            currency: item.currency,
          })),
        );
        await recordViewedItemReminderSent(userId, items.map((i) => i.product_id));
        sent++;
      } catch (err) {
        console.error(`Viewed item reminder failed for ${email}:`, err);
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, users: byUser.size, sent, skipped });
  } catch (err) {
    console.error("Viewed item reminder cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
