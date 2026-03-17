import { NextRequest, NextResponse } from "next/server";
import {
  getPilotStatus,
  createPilotEntry,
  isEmailInWaitlist,
  checkAndApproveReferrer,
} from "@/app/lib/pilot-db";
import { sendPilotApprovalEmail } from "@/app/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, emailSubscribe, smsSubscribe, referralCode } = body;

    if (!email || !firstName) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedReferralCode = referralCode?.trim().toUpperCase() || undefined;

    const existingStatus = await getPilotStatus(normalizedEmail);
    if (existingStatus) {
      return NextResponse.json({ status: existingStatus, alreadyRegistered: true });
    }

    const inWaitlist = await isEmailInWaitlist(normalizedEmail);
    const status = inWaitlist ? "approved" : "pending";

    await createPilotEntry({
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || undefined,
      phone: phone?.trim() || undefined,
      emailSubscribe: !!emailSubscribe,
      smsSubscribe: !!smsSubscribe,
      status,
      referredBy: normalizedReferralCode,
    });

    // If signed up via a referral code, approve the referrer immediately
    if (normalizedReferralCode) {
      const approved = await checkAndApproveReferrer(normalizedReferralCode);
      if (approved) {
        // Fire-and-forget approval email
        sendPilotApprovalEmail(approved.email, approved.firstName ?? undefined).catch(
          (err) => console.error("[PilotRegister] Referrer approval email failed:", err)
        );
      }
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error("[PilotRegister]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
