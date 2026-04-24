import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getActiveUserEmails } from "@/app/lib/pilot-db";
import { sendFeedbackEmail } from "@/app/lib/email";

export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  return !!adminToken && adminToken === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const preview: boolean = body?.preview === true;
  const sendForReal: boolean = body?.send === true;
  const testEmail: string | undefined = body?.testEmail;

  if (!preview && !sendForReal && !testEmail) {
    return NextResponse.json(
      { error: "Provide { preview: true }, { send: true }, or { testEmail: '...' }." },
      { status: 400 }
    );
  }

  const emails = testEmail ? [testEmail] : await getActiveUserEmails();

  if (preview) {
    return NextResponse.json({ preview: true, recipients: emails.length });
  }

  if (emails.length === 0) {
    return NextResponse.json({ ok: true, message: "No active users found.", sent: 0 });
  }

  const { sent, failed } = await sendFeedbackEmail(emails);

  return NextResponse.json({ ok: true, recipients: emails.length, sent, failed, test: !!testEmail });
}
