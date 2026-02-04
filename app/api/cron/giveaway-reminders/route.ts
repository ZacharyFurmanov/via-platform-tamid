import { NextResponse } from "next/server";
import { getReminderCandidates, markReminderSent } from "@/app/lib/giveaway-db";
import { sendGiveawayReminder } from "@/app/lib/email";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const candidates = await getReminderCandidates();

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const { entry, category } of candidates) {
      try {
        await sendGiveawayReminder(entry.email, entry.referralCode, category);
        await markReminderSent(entry.id);
        sent++;
      } catch (err) {
        failed++;
        errors.push(`${entry.email}: ${err instanceof Error ? err.message : String(err)}`);
        console.error(`Failed to send reminder to ${entry.email}:`, err);
      }
    }

    console.log(`[Giveaway Reminders] Sent: ${sent}, Failed: ${failed}, Total candidates: ${candidates.length}`);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: candidates.length,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    console.error("[Giveaway Reminders] Cron job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
