import { NextResponse } from "next/server";
import { storeContactEmails } from "@/app/lib/stores";
import { getListingQuality } from "@/app/lib/listing-quality-db";
import { sendStoreListingDigest } from "@/app/lib/email";

// Weekly listing-quality email to each store partner. Scans live products (so it
// reflects the latest sync) and only emails stores that actually have flagged
// listings.
export const maxDuration = 300;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 let sent = 0;
 let skipped = 0;
 const entries = Object.entries(storeContactEmails);
 for (let i = 0; i < entries.length; i++) {
 const [slug, email] = entries[i];
 if (!email) { skipped++; continue; }
 try {
 const quality = await getListingQuality(slug);
 const summary = quality.stores[0];
 if (!summary || summary.flagged === 0) { skipped++; continue; }

 const products = quality.products.slice(0, 10).map((p) => ({
  title: p.title,
  url: `${BASE_URL}${p.url}`,
  flags: [
  p.noDescription ? "no description" : null,
  p.noSize ? "no size" : null,
  p.noMeasurements ? "no measurements" : null,
  p.noImage ? "no image" : null,
  ].filter(Boolean) as string[],
 }));

 await sendStoreListingDigest({
  email,
  storeName: summary.storeName,
  flagged: summary.flagged,
  total: summary.total,
  counts: { noDescription: summary.noDescription, noSize: summary.noSize, noMeasurements: summary.noMeasurements, noImage: summary.noImage },
  products,
  dashboardUrl: `${BASE_URL}/store/dashboard`,
 });
 sent++;
 } catch (err) {
 console.error(`[store-listing-digest] failed for ${slug}:`, err);
 skipped++;
 }
 // Stay under Resend's rate limit.
 if ((i + 1) % 4 === 0) await new Promise((r) => setTimeout(r, 1000));
 }

 return NextResponse.json({ ok: true, sent, skipped });
}
