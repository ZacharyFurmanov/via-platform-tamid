import { NextResponse } from "next/server";
import { sendWaitlistConfirmationEmail } from "@/app/lib/email";

export async function GET() {
  await sendWaitlistConfirmationEmail("hana@theviaplatform.com", "Hana");
  return NextResponse.json({ ok: true, sent: "hana@theviaplatform.com" });
}
