import { NextResponse } from "next/server";
import { sendPilotApprovalEmail } from "@/app/lib/email";

export async function GET() {
  await sendPilotApprovalEmail("hana@theviaplatform.com", "Hana");
  return NextResponse.json({ ok: true });
}
