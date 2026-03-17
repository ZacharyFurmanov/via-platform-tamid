import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getPilotStatus,
  createPilotEntry,
  isEmailInWaitlist,
  checkAndApproveReferrer,
} from "@/app/lib/pilot-db";
import { sendPilotApprovalEmail } from "@/app/lib/email";

export async function GET(request: NextRequest) {
  const session = await auth();
  const next = request.nextUrl.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const email = session.user.email.toLowerCase().trim();
  let status = await getPilotStatus(email);

  if (status === null) {
    const inWaitlist = await isEmailInWaitlist(email);
    status = inWaitlist ? "approved" : "pending";

    // Pick up referral code set by Google OAuth flow (short-lived client cookie)
    const pendingRef = request.cookies.get("vya_pending_ref")?.value;
    const referredBy = pendingRef ? decodeURIComponent(pendingRef).toUpperCase() : undefined;

    await createPilotEntry({ email, status, referredBy });

    // If referred, approve the referrer immediately
    if (referredBy) {
      const approved = await checkAndApproveReferrer(referredBy);
      if (approved) {
        sendPilotApprovalEmail(approved.email, approved.firstName ?? undefined).catch(
          (err) => console.error("[PilotCheck] Referrer approval email failed:", err)
        );
      }
    }
  }

  if (status === "approved") {
    const response = NextResponse.redirect(new URL(safeNext, request.url));
    response.cookies.set("via_access", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    // Clear the pending referral cookie
    response.cookies.delete("vya_pending_ref");
    return response;
  }

  const response = NextResponse.redirect(new URL("/pilot-pending", request.url));
  response.cookies.delete("vya_pending_ref");
  return response;
}
