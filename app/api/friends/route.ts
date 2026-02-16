import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getFriends } from "@/app/lib/friends-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const friends = await getFriends(session.user.id);
  return NextResponse.json({ friends });
}
