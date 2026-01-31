import { NextResponse } from "next/server";
import { recordPhoneInvites } from "@/app/lib/giveaway-db";

export async function POST(request: Request) {
  try {
    const { referralCode, phone1, phone2 } = await request.json();

    if (!referralCode) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    if (phone1 || phone2) {
      await recordPhoneInvites(referralCode, phone1 || "", phone2 || "");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Giveaway invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
