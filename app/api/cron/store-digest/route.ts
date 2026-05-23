import { NextResponse } from "next/server";
import { getStoreDigestCandidates, recordStoreDigestSent } from "@/app/lib/notification-db";
import { sendStoreDigestEmail } from "@/app/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 try {
 const candidates = await getStoreDigestCandidates();
 let sent = 0;
 let skipped = 0;

 for (const { user_id, email, stores } of candidates) {
 try {
 await sendStoreDigestEmail(email, stores, BASE_URL);
 await recordStoreDigestSent(user_id);
 sent++;
 } catch (err) {
 console.error(`Store digest email failed for ${email}:`, err);
 skipped++;
 }
 }

 return NextResponse.json({ ok: true, candidates: candidates.length, sent, skipped });
 } catch (err) {
 console.error("Store digest cron error:", err);
 return NextResponse.json({ error: "Internal error" }, { status: 500 });
 }
}
