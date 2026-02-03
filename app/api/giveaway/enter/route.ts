import { NextResponse } from "next/server";
import { createGiveawayEntry, processReferralEntry } from "@/app/lib/giveaway-db";
import { sendGiveawayConfirmation, sendFriendEnteredEmail } from "@/app/lib/email";

export async function POST(request: Request) {
  try {
    const { email, refCode } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create entry (deduplicates via UNIQUE constraint)
    const { referralCode, isExisting } = await createGiveawayEntry(normalizedEmail, refCode);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";
    const referralLink = `${baseUrl}/waitlist?ref=${referralCode}`;

    // Send confirmation email to the new user (only for new entries)
    if (!isExisting) {
      try {
        await sendGiveawayConfirmation(normalizedEmail, referralCode);
      } catch (err) {
        console.error("Failed to send confirmation email:", err);
      }

      // If they were referred, update the referrer's count
      if (refCode && typeof refCode === "string") {
        try {
          const result = await processReferralEntry(normalizedEmail, refCode);
          if (result && result.friendNumber) {
            // Send progress email to the referrer (only for first 2 friends)
            await sendFriendEnteredEmail(
              result.referrerEntry.email,
              result.referrerEntry.referralCode,
              result.friendNumber
            );
          }
        } catch (err) {
          console.error("Failed to process referral:", err);
        }
      }
    }

    return NextResponse.json({
      referralCode,
      referralLink,
      isNew: !isExisting,
    });
  } catch (error) {
    console.error("Giveaway enter error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
