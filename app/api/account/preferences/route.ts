import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationEmailsEnabled } = await request.json();
  if (typeof notificationEmailsEnabled !== "boolean") {
    return NextResponse.json({ error: "notificationEmailsEnabled must be a boolean" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const sql = neon(url);
  await sql`
    UPDATE users SET notification_emails_enabled = ${notificationEmailsEnabled}, updated_at = NOW()
    WHERE id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true });
}
