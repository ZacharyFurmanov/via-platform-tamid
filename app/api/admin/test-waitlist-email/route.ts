import { NextRequest, NextResponse } from "next/server";
import { sendWaitlistConfirmationEmail } from "@/app/lib/email";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return !!token && token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await sendWaitlistConfirmationEmail("hana@theviaplatform.com", "Hana");
  return NextResponse.json({ ok: true, sent: "hana@theviaplatform.com" });
}
