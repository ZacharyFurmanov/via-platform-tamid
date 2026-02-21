import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserMembershipStatus } from "@/app/lib/membership-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getUserMembershipStatus(session.user.id);
    return NextResponse.json(status);
  } catch (err) {
    console.error("Membership status error:", err);
    return NextResponse.json({ error: "Failed to fetch membership status" }, { status: 500 });
  }
}
