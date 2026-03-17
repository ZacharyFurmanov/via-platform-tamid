import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getReferralInfo } from "@/app/lib/pilot-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const info = await getReferralInfo(session.user.email);
  return NextResponse.json(info);
}
