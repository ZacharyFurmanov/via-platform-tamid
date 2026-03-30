import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  getPilotStatus,
  getPilotReferralCode,
  createPilotEntry,
  checkAndApproveReferrer,
} from "@/app/lib/pilot-db";
import { sendPilotApprovalEmail, sendWaitlistConfirmationEmail } from "@/app/lib/email";

// Promo codes grant instant approval and are tracked in the promo_code column
const PROMO_CODES: Record<string, string> = {
  NYC: "nyc-popup-2026-03-29",
};

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return url;
}

async function recordPromoCode(email: string, promoKey: string) {
  const sql = neon(getDatabaseUrl());
  await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS promo_code TEXT`;
  await sql`
    UPDATE pilot_access
    SET promo_code = COALESCE(promo_code, ${promoKey})
    WHERE email = ${email}
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, emailSubscribe, smsSubscribe, referralCode, accessCode } = body;

    if (!email || !firstName) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedReferralCode = referralCode?.trim().toUpperCase() || undefined;

    const promoKey = accessCode?.trim().toUpperCase() ?? "";
    const promoSource = PROMO_CODES[promoKey];
    const isPromoCode = !!promoSource;

    const existingStatus = await getPilotStatus(normalizedEmail);
    if (existingStatus) {
      // If they're pending and have a valid promo code, upgrade them to approved
      if (isPromoCode && existingStatus === "pending") {
        const sql = neon(getDatabaseUrl());
        await sql`ALTER TABLE pilot_access ADD COLUMN IF NOT EXISTS promo_code TEXT`;
        await sql`
          UPDATE pilot_access
          SET status = 'approved', approved_at = NOW(), promo_code = COALESCE(promo_code, ${promoKey})
          WHERE email = ${normalizedEmail}
        `;
        sendPilotApprovalEmail(normalizedEmail, firstName?.trim() || "").catch(
          (err) => console.error("[PilotRegister] Approval email failed:", err)
        );
        const existingCode = await getPilotReferralCode(normalizedEmail);
        return NextResponse.json({ status: "approved", referralCode: existingCode });
      }
      const existingCode = await getPilotReferralCode(normalizedEmail);
      return NextResponse.json({ status: existingStatus, alreadyRegistered: true, referralCode: existingCode });
    }

    // Check access code — valid code grants immediate approval
    const ACCESS_CODES = new Set(["kendell", "elsa", "vintageedit", "kamryn"]);
    const hasValidCode = isPromoCode || (accessCode && ACCESS_CODES.has(accessCode.trim().toLowerCase()));
    const status = hasValidCode ? "approved" : "pending";

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

    // Record promo code for tracking
    if (isPromoCode) {
      await recordPromoCode(normalizedEmail, promoKey).catch(
        (err) => console.error("[PilotRegister] Promo code record failed:", err)
      );
    }

    if (hasValidCode) {
      sendPilotApprovalEmail(normalizedEmail, firstName.trim()).catch(
        (err) => console.error("[PilotRegister] Approval email failed:", err)
      );
    } else {
      sendWaitlistConfirmationEmail(normalizedEmail, firstName.trim()).catch(
        (err) => console.error("[PilotRegister] Waitlist email failed:", err)
      );
    }

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
