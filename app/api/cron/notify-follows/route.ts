import { NextResponse } from "next/server";
import { getPendingFollowNotifications, markFollowsNotified } from "@/app/lib/store-follows-db";
import { sendExpoPush } from "@/app/lib/push";
import { stores } from "@/app/lib/stores";

export const dynamic = "force-dynamic";

/**
 * Drop alerts: pushes "new arrivals" to anyone following a store that has added
 * products since they were last notified. Runs after the sync-stores crons.
 */
export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 if (!process.env.CRON_SECRET) {
 return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
 }
 if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const pending = await getPendingFollowNotifications();
 if (pending.length === 0) return NextResponse.json({ notified: 0 });

 const nameBySlug = new Map(stores.map((s) => [s.slug, s.name]));
 const notifiedIds: number[] = [];

 for (const p of pending) {
 const name = nameBySlug.get(p.storeSlug) ?? "A store you follow";
 const n = p.newCount;
 await sendExpoPush([p.pushToken], {
  title: "New arrivals ✨",
  body: `${name} just added ${n} new piece${n === 1 ? "" : "s"}.`,
  data: { type: "store_drop", storeSlug: p.storeSlug },
 });
 notifiedIds.push(p.id);
 }

 await markFollowsNotified(notifiedIds);
 return NextResponse.json({ notified: notifiedIds.length });
}
