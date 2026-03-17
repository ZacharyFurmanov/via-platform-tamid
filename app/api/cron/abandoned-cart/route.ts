import { NextResponse } from "next/server";
import { getAbandonedCartItems, markAbandonedCartEmailSent } from "@/app/lib/cart-db";
import { sendAbandonedCartEmail } from "@/app/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getAbandonedCartItems();
    let sent = 0;
    let skipped = 0;

    for (const item of items) {
      const productUrl = `${BASE_URL}/products/${item.store_slug}-${item.product_id}`;

      try {
        await sendAbandonedCartEmail(
          item.email,
          item.product_title,
          item.product_image,
          item.store_name,
          productUrl,
          item.price,
          item.currency,
        );
        await markAbandonedCartEmailSent(item.user_id, item.product_id);
        sent++;
      } catch (err) {
        console.error(`Abandoned cart email failed for ${item.email}:`, err);
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, candidates: items.length, sent, skipped });
  } catch (err) {
    console.error("Abandoned cart cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
