import { NextResponse } from "next/server";
import { backfillSizeKeys } from "@/app/lib/size-keys-db";

// Keeps products.size_keys in sync with the derived display size. Runs after the
// daily catalog sync so re-synced items (and any whose fit note changed) get
// fresh, range-expanded size tokens for the list endpoints to filter on.
export const maxDuration = 300;

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 try {
 const result = await backfillSizeKeys();
 return NextResponse.json({ ok: true, ...result });
 } catch (err) {
 console.error("[cron/backfill-size-keys] failed:", err);
 return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
 }
}
