import { NextRequest, NextResponse } from "next/server";
import {
  getPilotStatus,
  getPilotReferralCode,
  createPilotEntry,
  checkAndApproveReferrer,
} from "@/app/lib/pilot-db";
import { sendPilotApprovalEmail, sendWaitlistConfirmationEmail } from "@/app/lib/email";

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
      const existingCode = await getPilotReferralCode(normalizedEmail);
      return NextResponse.json({ status: existingStatus, alreadyRegistered: true, referralCode: existingCode });
    }

    // Everyone starts as pending — approved via cron after 7 days or manual approval
    const status = "pending";

    const myReferralCode = await createPilotEntry({
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || undefined,
      phone: phone?.trim() || undefined,
      emailSubscribe: !!emailSubscribe,
      smsSubscribe: !!smsSubscribe,
      status,
      referredBy: normalizedReferralCode,
    });

    sendWaitlistConfirmationEmail(normalizedEmail, firstName.trim()).catch(
      (err) => console.error("[PilotRegister] Waitlist email failed:", err)
    );

    // If signed up via a referral code, approve the referrer immediately
    if (normalizedReferralCode) {
      const approved = await checkAndApproveReferrer(normalizedReferralCode);
      if (approved) {
        sendPilotApprovalEmail(approved.email, approved.firstName ?? undefined).catch(
          (err) => console.error("[PilotRegister] Referrer approval email failed:", err)
        );
      }
    }

    return NextResponse.json({ status, referralCode: myReferralCode });
  } catch (error) {
    console.error("[PilotRegister]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
