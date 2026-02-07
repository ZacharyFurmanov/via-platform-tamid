import { NextResponse } from "next/server";
import { getReminderCandidates, markReminderSent } from "@/app/lib/giveaway-db";
import { sendGiveawayReminder } from "@/app/lib/email";

// GET: Preview candidates without sending (dry run)
export async function GET() {
  try {
    const candidates = await getReminderCandidates();

    const byCategory = candidates.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      total: candidates.length,
      categories: byCategory,
      candidates: candidates.map(({ entry, category }) => ({
        id: entry.id,
        email: entry.email,
        referralCode: entry.referralCode,
        referralCount: entry.referralCount,
        category,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
      config: {
        hasCronSecret: !!process.env.CRON_SECRET,
        hasResendKey: !!process.env.RESEND_API_KEY,
      },
    });
  } catch (error) {
    console.error("[Admin Giveaway Reminders] Error fetching candidates:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch candidates" },
      { status: 500 }
    );
  }
}

// POST: Actually send reminders to all candidates
export async function POST() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const candidates = await getReminderCandidates();

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, total: 0 });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const results: { email: string; status: "sent" | "failed"; error?: string }[] = [];

    for (const { entry, category } of candidates) {
      try {
        await sendGiveawayReminder(entry.email, entry.referralCode, category);
        await markReminderSent(entry.id);
        sent++;
        results.push({ email: entry.email, status: "sent" });
      } catch (err) {
        failed++;
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${entry.email}: ${errMsg}`);
        results.push({ email: entry.email, status: "failed", error: errMsg });
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: candidates.length,
      results,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    console.error("[Admin Giveaway Reminders] Error sending reminders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminders" },
      { status: 500 }
    );
  }
}
