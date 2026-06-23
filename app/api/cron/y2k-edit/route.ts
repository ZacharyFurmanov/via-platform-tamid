import { NextResponse } from "next/server";
import { getApprovedPilotEmails } from "@/app/lib/pilot-db";
import { sendY2KEditEmail, type EditLook } from "@/app/lib/email";
import { getSetting, saveSetting } from "@/app/lib/settings-db";

// Allow up to 5 minutes for bulk sending
export const maxDuration = 300;

const BASE = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
 ? process.env.NEXT_PUBLIC_BASE_URL
 : `https://${process.env.NEXT_PUBLIC_BASE_URL || "vyaplatform.com"}`;

// One-off "Y2K, Styled" lookbook. Curated shop-the-look content — image + its
// shoppable pieces. Photos live in /public/y2k-edit/.
const LOOKS: EditLook[] = [
 {
 image: `${BASE}/y2k-edit/look-1.jpg`,
 items: [
 { label: "Dress", url: "https://vyaplatform.com/products/mookie-studios-1895088" },
 { label: "Sunglasses", url: "https://vyaplatform.com/products/petria-vintage-132836" },
 ],
 },
 {
 image: `${BASE}/y2k-edit/look-2.jpg`,
 items: [
 { label: "Jacket", url: "https://vyaplatform.com/products/sourced-by-scottie-1745827" },
 { label: "Shorts", url: "https://vyaplatform.com/products/lover-girl-vintage-1176959" },
 { label: "Boots", url: "https://vyaplatform.com/products/rareality-archive-1988266" },
 { label: "Bag", url: "https://vyaplatform.com/products/to-us-vintage-1948579" },
 ],
 },
 {
 image: `${BASE}/y2k-edit/look-3.jpg`,
 items: [
 { label: "Bag", url: "https://vyaplatform.com/products/hachi-archive-1252723" },
 { label: "Shoes", url: "https://vyaplatform.com/products/club-fleur-1495396" },
 { label: "Skirt", url: "https://vyaplatform.com/products/lover-girl-vintage-1393591" },
 ],
 },
 {
 image: `${BASE}/y2k-edit/look-4.jpg`,
 items: [
 { label: "Top", url: "https://vyaplatform.com/products/sourced-by-scottie-1506092" },
 { label: "Shorts", url: "https://vyaplatform.com/products/mookie-studios-1895081" },
 { label: "Shoes", url: "https://vyaplatform.com/products/chill-boutique-2256064" },
 ],
 },
 {
 image: `${BASE}/y2k-edit/look-5.jpg`,
 items: [
 { label: "Top", url: "https://vyaplatform.com/products/mookie-studios-1895099" },
 { label: "Jeans", url: "https://vyaplatform.com/products/sourced-by-scottie-1987435" },
 { label: "Bag", url: "https://vyaplatform.com/products/promised-vintage-91691" },
 { label: "Shoes", url: "https://vyaplatform.com/products/capsule-edit-2028118" },
 ],
 },
];

const SENT_KEY = "y2k_edit_sent_at";

/**
 * GET /api/cron/y2k-edit
 *
 * One-time send (Wed 4 PM ET via vercel.json `0 20 * * 3`). The cron line stays,
 * but a persisted lock (`y2k_edit_sent_at`) makes it send only once — later
 * firings no-op. `?testEmail=x` sends only to that address and never sets the lock.
 */
export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 const { searchParams } = new URL(request.url);
 const testEmail = searchParams.get("testEmail");

 // Test sends (testEmail) are open; real sends require the cron secret.
 if (!testEmail && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 // One-time guard: if already sent, do nothing (test sends bypass this).
 if (!testEmail) {
 const already = await getSetting(SENT_KEY);
 if (already) {
 return NextResponse.json({ ok: true, skipped: "already sent", sentAt: already });
 }
 }

 const emails = testEmail ? [testEmail] : await getApprovedPilotEmails();
 if (emails.length === 0) {
 return NextResponse.json({ ok: true, message: "No recipients.", sent: 0 });
 }

 const { sent, failed } = await sendY2KEditEmail(emails, LOOKS);

 // Claim the one-time lock only on a real send that actually went out.
 if (!testEmail && sent > 0) {
 await saveSetting(SENT_KEY, new Date().toISOString());
 }

 return NextResponse.json({
 ok: true,
 looks: LOOKS.length,
 recipients: emails.length,
 sent,
 failed,
 test: !!testEmail,
 });
}
