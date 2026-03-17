import { NextResponse } from "next/server";
import { getTrendingCandidates, recordTrendingNotificationSent } from "@/app/lib/notification-db";
import { sendTrendingItemEmail } from "@/app/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const candidates = await getTrendingCandidates();
    let sent = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const productUrl = `${BASE_URL}/products/${candidate.store_slug}-${candidate.product_id}`;

      try {
        await sendTrendingItemEmail(
          candidate.email,
          candidate.product_title,
          candidate.product_image,
          candidate.store_name,
          productUrl,
          candidate.favorite_count,
          candidate.price,
          candidate.currency,
        );
        await recordTrendingNotificationSent(candidate.user_id, candidate.product_id);
        sent++;
      } catch (err) {
        console.error(`Trending email failed for ${candidate.email}:`, err);
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, candidates: candidates.length, sent, skipped });
  } catch (err) {
    console.error("Trending items cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
