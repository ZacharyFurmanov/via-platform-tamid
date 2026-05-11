import { NextResponse } from "next/server";
import { getLastChanceCandidates, recordLastChanceSent } from "@/app/lib/notification-db";
import { sendLastChanceEmail } from "@/app/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const byUser = await getLastChanceCandidates();
    let sent = 0;
    let skipped = 0;

    for (const [userId, { email, items }] of byUser) {
      try {
        await sendLastChanceEmail(
          email,
          items.map((item) => ({
            productTitle: item.product_title,
            productImage: item.product_image,
            storeName: item.store_name,
            productUrl: `${BASE_URL}/products/${item.store_slug}-${item.product_id}?utm_source=email&utm_medium=email&utm_campaign=last_chance`,
            price: item.price,
            currency: item.currency,
            daysSaved: item.days_saved,
          })),
        );
        await recordLastChanceSent(userId, items.map((i) => i.product_id));
        sent++;
      } catch (err) {
        console.error(`Last chance email failed for ${email}:`, err);
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, users: byUser.size, sent, skipped });
  } catch (err) {
    console.error("Last chance cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
