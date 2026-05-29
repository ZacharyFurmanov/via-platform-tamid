import { NextResponse } from "next/server";

// This cron was deleting all products from Squarespace stores that hadn't
// had a click in 3 days, causing every sync to re-insert them as "new arrivals".
// It has been disabled. Squarespace product cleanup is handled by the normal
// syncProducts() sold-item detection during the sync-stores cron.
export async function GET() {
  return NextResponse.json({ disabled: true, reason: "Caused false new-arrival resets" });
}
