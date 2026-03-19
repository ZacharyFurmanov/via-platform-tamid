import { NextRequest, NextResponse } from "next/server";
import { approvePilotUser } from "@/app/lib/pilot-db";
import { sendPilotApprovalEmail } from "@/app/lib/email";
import crypto from "crypto";

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  return !!adminToken && adminToken === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, firstName } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    await approvePilotUser(email);
    try {
      await sendPilotApprovalEmail(email, firstName ?? undefined);
    } catch (emailErr) {
      console.error("[approve] email failed:", emailErr);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[approve]", err);
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}
