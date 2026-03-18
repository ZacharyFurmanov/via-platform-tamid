import { NextRequest, NextResponse } from "next/server";
import { approvePilotUser } from "@/app/lib/pilot-db";
import { sendPilotApprovalEmail } from "@/app/lib/email";

function isAdminAuthenticated(request: NextRequest): boolean {
  const adminToken = request.cookies.get("via_admin_token")?.value;
  const expectedToken = process.env.ADMIN_PASSWORD;
  if (!expectedToken || !adminToken) return false;
  let hash = 0;
  for (let i = 0; i < expectedToken.length; i++) {
    const char = expectedToken.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return adminToken === hash.toString(36);
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
