import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendPilotApprovalEmail } from "@/app/lib/email";

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
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "hana@theviaplatform.com";
  const name = searchParams.get("name") || undefined;
  await sendPilotApprovalEmail(email, name);
  return NextResponse.json({ ok: true, sentTo: email });
}
