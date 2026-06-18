import { NextResponse } from "next/server";
import { getBaseUrl } from "@/app/lib/base-url";
import { getTrendingCandidates, claimTrendingNotificationSlots } from "@/app/lib/notification-db";
import { sendTrendingItemEmail, type TrendingEmailProduct } from "@/app/lib/email";

const BASE_URL = getBaseUrl();
const MAX_ITEMS_PER_EMAIL = 5;

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

 const email = items[0].email;
 const allProductIds = items.map((c) => c.product_id);

 // Atomically claim notification slots before sending. If another cron
 // instance (e.g. from a concurrent deployment) already claimed these
 // products for this user, claimed will be empty and we skip — preventing
 // duplicate emails when two instances race.
 const claimed = await claimTrendingNotificationSlots(userId, allProductIds);
 if (claimed.length === 0) {
  skipped++;
  continue;
 }

 // Only show claimed products (up to max), preserving sort order
 const claimedSet = new Set(claimed);
 const toShow = items.filter((c) => claimedSet.has(c.product_id)).slice(0, MAX_ITEMS_PER_EMAIL);

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
