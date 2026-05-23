import { NextResponse } from "next/server";
import { getTrendingCandidates, recordTrendingNotificationSent } from "@/app/lib/notification-db";
import { sendTrendingItemEmail, type TrendingEmailProduct } from "@/app/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";
const MAX_ITEMS_PER_EMAIL = 5;

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 try {
 const candidates = await getTrendingCandidates();

 // Group all trending items by user — one email per user, never one per product
 const byUser = new Map<string, typeof candidates>();
 for (const c of candidates) {
 const existing = byUser.get(c.user_id) ?? [];
 existing.push(c);
 byUser.set(c.user_id, existing);
 }

 let sent = 0;
 let skipped = 0;

 for (const [userId, items] of byUser) {
 // Sort by favorite count desc so the hottest items lead the email
 items.sort((a, b) => b.favorite_count - a.favorite_count);

 // Show top MAX_ITEMS_PER_EMAIL in the email; mark ALL as sent so they won't re-trigger
 const toShow = items.slice(0, MAX_ITEMS_PER_EMAIL);
 const email = items[0].email;

 const products: TrendingEmailProduct[] = toShow.map((c) => ({
 title: c.product_title,
 image: c.product_image,
 storeName: c.store_name,
 productUrl: `${BASE_URL}/products/${c.store_slug}-${c.product_id}?utm_source=email&utm_medium=email&utm_campaign=trending_item`,
 favoriteCount: c.favorite_count,
 price: c.price,
 currency: c.currency,
 }));

 try {
 await sendTrendingItemEmail(email, products);
 // Record every trending item for this user as sent (not just the ones shown)
 // so the full list doesn't re-queue on the next run
 await Promise.all(
 items.map((c) => recordTrendingNotificationSent(userId, c.product_id))
 );
 sent++;
 } catch (err) {
 console.error(`Trending email failed for ${email}:`, err);
 skipped++;
 }
 }

 return NextResponse.json({ ok: true, candidates: candidates.length, usersNotified: sent, skipped });
 } catch (err) {
 console.error("Trending items cron error:", err);
 return NextResponse.json({ error: "Internal error" }, { status: 500 });
 }
}
