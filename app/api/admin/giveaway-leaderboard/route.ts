import { NextResponse } from "next/server";
import { getWaitlistLeaderboard } from "@/app/lib/pilot-db";

export async function GET() {
  try {
    const entries = await getWaitlistLeaderboard();

    const total = entries.length;
    const approved = entries.filter((e) => e.status === "approved").length;
    const pending = entries.filter((e) => e.status === "pending").length;
    const withReferrals = entries.filter((e) => e.referralCount > 0).length;

    return NextResponse.json({
      stats: { total, approved, pending, withReferrals },
      entries: entries.map((e) => ({
        rank: e.rank,
        email: e.email,
        firstName: e.firstName,
        referralCode: e.referralCode,
        referralCount: e.referralCount,
        status: e.status,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error("[Admin Referral Board] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
