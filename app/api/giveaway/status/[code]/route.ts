import { NextResponse } from "next/server";
import { getEntryByCode } from "@/app/lib/giveaway-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const entry = await getEntryByCode(code);

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({
      referralCode: entry.referralCode,
      referralCount: entry.referralCount,
      friend1Entered: !!entry.friend1Email,
      friend2Entered: !!entry.friend2Email,
      isComplete: entry.referralCount >= 2,
      // Each referral beyond the first 2 gives additional entries
      totalEntries: Math.max(0, entry.referralCount - 1),
    });
  } catch (error) {
    console.error("Giveaway status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
