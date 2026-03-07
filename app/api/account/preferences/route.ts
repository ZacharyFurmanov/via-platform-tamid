import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { collection, doc, setDoc } from "firebase/firestore";
import { getDb, nowIso } from "@/app/lib/firebase-db";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationEmailsEnabled } = await request.json();
  if (typeof notificationEmailsEnabled !== "boolean") {
    return NextResponse.json({ error: "notificationEmailsEnabled must be a boolean" }, { status: 400 });
  }

  await setDoc(
    doc(collection(getDb(), "users"), session.user.id),
    {
      notification_emails_enabled: notificationEmailsEnabled,
      updated_at: nowIso(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
