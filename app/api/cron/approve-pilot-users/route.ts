import { NextResponse } from "next/server";
import { getPendingUsersToApprove, approvePilotUser } from "@/app/lib/pilot-db";
import { sendPilotApprovalEmail } from "@/app/lib/email";

export async function GET() {
  try {
    const users = await getPendingUsersToApprove();

    if (users.length === 0) {
      return NextResponse.json({ approved: 0 });
    }

    let approved = 0;
    for (const user of users) {
      await approvePilotUser(user.email);
      await sendPilotApprovalEmail(user.email, user.first_name ?? undefined);
      approved++;
    }

    console.log(`[PilotApproval] Approved ${approved} users`);
    return NextResponse.json({ approved });
  } catch (error) {
    console.error("[PilotApproval] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
