import { NextResponse } from "next/server";
import {
  getFavoriteNotificationCandidates,
  recordNotificationSent,
  getNotificationsSentTodayCount,
} from "@/app/lib/notification-db";
import { sendFavoriteActivityNotification } from "@/app/lib/email";

const MAX_DAILY_EMAILS_PER_USER = 3;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const candidates = await getFavoriteNotificationCandidates();
    let sent = 0;
    let skipped = 0;

    // Track per-user daily counts in this batch
    const dailyCounts = new Map<string, number>();

    for (const candidate of candidates) {
      // Check daily cap
      let todayCount = dailyCounts.get(candidate.user_id);
      if (todayCount === undefined) {
        todayCount = await getNotificationsSentTodayCount(candidate.user_id);
        dailyCounts.set(candidate.user_id, todayCount);
      }

      if (todayCount >= MAX_DAILY_EMAILS_PER_USER) {
        skipped++;
        continue;
      }

      const productUrl = `${BASE_URL}/products/${candidate.store_slug}-${candidate.product_id}`;

      try {
        await sendFavoriteActivityNotification(
          candidate.email,
          candidate.product_title,
          candidate.product_image,
          candidate.store_name,
          productUrl,
        );

        await recordNotificationSent(
          candidate.user_id,
          candidate.product_id,
          candidate.recent_click_count,
        );

        dailyCounts.set(candidate.user_id, (todayCount ?? 0) + 1);
        sent++;
      } catch (err) {
        console.error(`Failed to send notification to ${candidate.email}:`, err);
        skipped++;
      }
    }

    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      sent,
      skipped,
    });
  } catch (err) {
    console.error("Favorite notifications cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
