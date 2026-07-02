import { NextResponse } from "next/server";
import { stores } from "@/app/lib/stores";
import { buildStoreVoice } from "@/app/lib/store-voice";

// Nightly refresh of each store's AI writing-voice profile from their latest listings,
// so the listing drafter keeps matching how a seller actually writes as they add pieces.
// The voice is otherwise built once (lazily, on a store's first draft) and never updated.
// buildStoreVoice cheaply returns null for stores without enough written copy yet.
export const maxDuration = 300;

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const start = Date.now();
 let refreshed = 0;
 let skipped = 0;
 let failed = 0;
 for (const store of stores) {
 if (Date.now() - start > 270_000) break; // stay under the 300s function cap
 try {
 const voice = await buildStoreVoice(store.slug);
 if (voice) refreshed++;
 else skipped++;
 } catch (err) {
 failed++;
 console.error(`[cron/refresh-store-voices] ${store.slug} failed:`, err);
 }
 }

 return NextResponse.json({ ok: true, refreshed, skipped, failed, total: stores.length });
}
